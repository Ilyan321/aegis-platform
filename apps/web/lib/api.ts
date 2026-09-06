export interface Incident {
  id: string;
  repository_id: string;
  scan_run_id?: string | null;
  rule_id: string;
  rule_name: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: "OPEN" | "RESOLVED" | "REGRESSION" | "DISMISSED";
  verification_status: "ACTIVE" | "REVOKED" | "UNVERIFIABLE" | "SKIPPED" | "ERROR" | "NOT_VERIFIED";
  verification_details?: string | null;
  file_path: string;
  line_number: number;
  masked_snippet: string;
  commit_sha: string;
  committer_handle?: string | null;
  fingerprint: string;
  first_seen_at: string;
  last_seen_at: string;
  resolved_at?: string | null;
}

export interface IncidentAudit {
  id: string;
  incident_id: string;
  actor_id: string;
  action: string;
  previous_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
  created_at: string;
}

export interface Repository {
  id: string;
  organization_id: string;
  github_repo_id?: number | null;
  full_name: string;
  clone_url: string;
  default_branch: string;
  is_active: boolean;
  webhook_installed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScanRun {
  id: string;
  repository_id: string;
  commit_sha: string;
  branch: string;
  trigger_source: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  files_scanned: number;
  total_findings: number;
  active_leaks_count: number;
  duration_ms: number;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
  created_at: string;
}

export interface TelemetryData {
  total_repositories: number;
  total_scans: number;
  total_incidents: number;
  active_leaks: number;
  resolved_incidents: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  mean_time_to_remediate_hours: number;
  recent_incidents: Incident[];
  recent_scans: ScanRun[];
}

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getOAuthUrl(provider: "github" | "google", mode: "login" | "signup" = "login"): string {
  return `${API_BASE}/api/v1/auth/${provider}?mode=${mode}`;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit & { _isRetry?: boolean } = {}
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 401 && !options._isRetry && typeof window !== "undefined") {
      const success = await refreshSession();
      if (success) {
        return apiFetch<T>(endpoint, { ...options, _isRetry: true });
      }
      removeStoredToken();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login?reason=session_expired";
      }
    }
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed with status ${res.status}`);
  }

  if (res.status === 204) {
    return null as T;
  }
  return res.json();
}

export async function fetchTelemetry(organizationId?: string): Promise<TelemetryData> {
  const query = organizationId ? `?organization_id=${encodeURIComponent(organizationId)}` : "";
  return apiFetch<TelemetryData>(`/api/v1/telemetry${query}`);
}

export async function fetchRepositories(organizationId?: string): Promise<Repository[]> {
  const query = organizationId ? `?organization_id=${encodeURIComponent(organizationId)}` : "";
  return apiFetch<Repository[]>(`/api/v1/repositories${query}`);
}

export async function fetchIncidents(filter?: {
  status?: string;
  severity?: string;
  repository_id?: string;
  organization_id?: string;
}): Promise<Incident[]> {
  const params = new URLSearchParams();
  if (filter?.status && filter.status !== "ALL") {
    params.set("status", filter.status);
  }
  if (filter?.severity) {
    params.set("severity", filter.severity);
  }
  if (filter?.repository_id) {
    params.set("repository_id", filter.repository_id);
  }
  if (filter?.organization_id) {
    params.set("organization_id", filter.organization_id);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<Incident[]>(`/api/v1/incidents${query}`);
}

export async function updateIncidentStatus(
  id: string,
  newStatus: "OPEN" | "RESOLVED" | "DISMISSED",
  reason?: string,
  actorEmail?: string
): Promise<Incident> {
  return apiFetch<Incident>(`/api/v1/incidents/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      status: newStatus,
      actor_id: actorEmail || "DASHBOARD_OPERATOR",
      reason: reason || "Status updated via Aegis Console",
    }),
  });
}

export async function fetchIncidentAudits(id: string): Promise<IncidentAudit[]> {
  return apiFetch<IncidentAudit[]>(`/api/v1/incidents/${id}/audits`);
}

export async function createRepository(payload: {
  organization_id?: string;
  full_name: string;
  clone_url: string;
  default_branch?: string;
  webhook_secret?: string;
  github_repo_id?: number | null;
}): Promise<Repository> {
  return apiFetch<Repository>("/api/v1/repositories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteRepository(id: string): Promise<void> {
  return apiFetch<void>(`/api/v1/repositories/${id}`, {
    method: "DELETE",
  });
}

export async function triggerRepositoryScan(repoId: string): Promise<ScanRun> {
  return apiFetch<ScanRun>(`/api/v1/repositories/${repoId}/scan`, {
    method: "POST",
  });
}

export async function triggerScanAllRepositories(): Promise<ScanRun[]> {
  return apiFetch<ScanRun[]>("/api/v1/repositories/scan-all", {
    method: "POST",
  });
}

export async function fetchRepositoryScans(repoId: string): Promise<ScanRun[]> {
  return apiFetch<ScanRun[]>(`/api/v1/repositories/${repoId}/scans`);
}

export interface GitHubRepoItem {
  id: number;
  name: string;
  full_name: string;
  clone_url: string;
  default_branch: string;
  private: boolean;
  description?: string | null;
  html_url?: string;
}

export interface GitHubRepoResponse {
  connected: boolean;
  repositories: GitHubRepoItem[];
  error?: string;
}

export async function fetchGitHubRepositories(username?: string): Promise<GitHubRepoResponse> {
  const params = new URLSearchParams();
  if (username) params.set("username", username);
  const query = params.toString() ? `?${params.toString()}` : "";
  try {
    return await apiFetch<GitHubRepoResponse>(`/api/v1/auth/github/repos${query}`);
  } catch {
    return { connected: false, repositories: [] };
  }
}

export async function fetchOrganizations(): Promise<Array<{ id: string; name: string; slug: string }>> {
  return apiFetch<Array<{ id: string; name: string; slug: string }>>("/api/v1/organizations");
}

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  provider: string;
  organization_id?: string | null;
  has_github_token?: boolean;
  is_verified?: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user: User;
}

const TOKEN_KEY = "aegis_auth_token";
const REFRESH_KEY = "aegis_refresh_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setStoredToken(token: string, refreshToken?: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
    document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax;`;
    if (refreshToken) {
      localStorage.setItem(REFRESH_KEY, refreshToken);
    }
  }
}

export function removeStoredToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax;`;
  }
}

export async function refreshSession(): Promise<boolean> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      removeStoredToken();
      return false;
    }

    const data: AuthResponse = await res.json();
    setStoredToken(data.access_token, data.refresh_token);
    return true;
  } catch {
    removeStoredToken();
    return false;
  }
}

export async function logoutUser(): Promise<void> {
  const refreshToken = getStoredRefreshToken();
  const token = getStoredToken();
  try {
    if (refreshToken || token) {
      await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ refresh_token: refreshToken || "" }),
      });
    }
  } finally {
    removeStoredToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Authentication failed");
  }
  const data: AuthResponse = await res.json();
  setStoredToken(data.access_token, data.refresh_token);
  return data;
}

export async function registerUser(email: string, password: string, fullName?: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: fullName || undefined }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Registration failed");
  }
  const data: AuthResponse = await res.json();
  setStoredToken(data.access_token, data.refresh_token);
  return data;
}

export async function fetchCurrentUser(): Promise<User | null> {
  const token = getStoredToken();
  if (!token) {
    const refreshToken = getStoredRefreshToken();
    if (refreshToken) {
      const refreshed = await refreshSession();
      if (!refreshed) return null;
    } else {
      return null;
    }
  }

  try {
    return await apiFetch<User>("/api/v1/auth/me");
  } catch {
    removeStoredToken();
    return null;
  }
}

export async function verifyEmail(email: string, otp: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/v1/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Email verification failed");
  }
  const data: AuthResponse = await res.json();
  setStoredToken(data.access_token, data.refresh_token);
  return data;
}

export async function resendOtp(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/v1/auth/resend-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to resend verification code");
  }
  return res.json();
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/v1/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Password recovery request failed");
  }
  return res.json();
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/v1/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Password reset failed");
  }
  return res.json();
}

export interface OrganizationSettings {
  id: string;
  name: string;
  slug: string;
  slack_webhook_url?: string | null;
  discord_webhook_url?: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchWorkspaceSettings(): Promise<OrganizationSettings> {
  return apiFetch<OrganizationSettings>("/api/v1/organizations/settings");
}

export async function updateWorkspaceSettings(payload: {
  slack_webhook_url?: string | null;
  discord_webhook_url?: string | null;
}): Promise<OrganizationSettings> {
  return apiFetch<OrganizationSettings>("/api/v1/organizations/settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function sendTestAlert(channel: "slack" | "discord"): Promise<{ status: string; message: string }> {
  return apiFetch<{ status: string; message: string }>("/api/v1/organizations/settings/test-alert", {
    method: "POST",
    body: JSON.stringify({ channel }),
  });
}

export interface WebhookConfig {
  webhook_url: string;
  webhook_secret: string;
  webhook_installed: boolean;
  events: string[];
}

export async function fetchWebhookConfig(repoId: string): Promise<WebhookConfig> {
  return apiFetch<WebhookConfig>(`/api/v1/repositories/${repoId}/webhook-config`);
}

export async function installRepositoryWebhook(repoId: string): Promise<{ status: string; message: string; webhook_installed: boolean }> {
  return apiFetch<{ status: string; message: string; webhook_installed: boolean }>(`/api/v1/repositories/${repoId}/install-webhook`, {
    method: "POST",
  });
}

export interface CliTokenResponse {
  cli_token: string;
  token_type: string;
  user_email: string;
  organization_id?: string | null;
  expires_in_days: number;
}

export async function fetchCliAuthToken(): Promise<CliTokenResponse> {
  return apiFetch<CliTokenResponse>("/api/v1/auth/cli-token");
}


