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

export function getOAuthUrl(provider: "github" | "google"): string {
  return `${API_BASE}/api/v1/auth/${provider}`;
}

export async function fetchTelemetry(organizationId?: string): Promise<TelemetryData> {
  const url = new URL(`${API_BASE}/api/v1/telemetry`);
  if (organizationId) url.searchParams.set("organization_id", organizationId);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch telemetry: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchRepositories(organizationId?: string): Promise<Repository[]> {
  const url = new URL(`${API_BASE}/api/v1/repositories`);
  if (organizationId) url.searchParams.set("organization_id", organizationId);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch repositories: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchIncidents(filter?: {
  status?: string;
  severity?: string;
  repository_id?: string;
  organization_id?: string;
}): Promise<Incident[]> {
  const url = new URL(`${API_BASE}/api/v1/incidents`);
  if (filter?.status && filter.status !== "ALL") {
    url.searchParams.set("status", filter.status);
  }
  if (filter?.severity) {
    url.searchParams.set("severity", filter.severity);
  }
  if (filter?.repository_id) {
    url.searchParams.set("repository_id", filter.repository_id);
  }
  if (filter?.organization_id) {
    url.searchParams.set("organization_id", filter.organization_id);
  }

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch incidents: ${res.statusText}`);
  }
  return res.json();
}


export async function updateIncidentStatus(
  id: string,
  newStatus: "OPEN" | "RESOLVED" | "DISMISSED",
  reason?: string
): Promise<Incident> {
  const res = await fetch(`${API_BASE}/api/v1/incidents/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: newStatus,
      actor_id: "DASHBOARD_OPERATOR",
      reason: reason || "Status updated via Aegis Console",
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update incident: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchIncidentAudits(id: string): Promise<IncidentAudit[]> {
  const res = await fetch(`${API_BASE}/api/v1/incidents/${id}/audits`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch incident audits: ${res.statusText}`);
  }
  return res.json();
}

export async function createRepository(payload: {
  organization_id: string;
  full_name: string;
  clone_url: string;
  default_branch?: string;
  webhook_secret?: string;
}): Promise<Repository> {
  const res = await fetch(`${API_BASE}/api/v1/repositories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to create repository");
  }
  return res.json();
}

export async function fetchOrganizations(): Promise<Array<{ id: string; name: string; slug: string }>> {
  const res = await fetch(`${API_BASE}/api/v1/organizations`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch organizations: ${res.statusText}`);
  }
  return res.json();
}

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  provider: string;
  organization_id?: string | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

const TOKEN_KEY = "aegis_auth_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function removeStoredToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
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
  setStoredToken(data.access_token);
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
  setStoredToken(data.access_token);
  return data;
}

export async function fetchCurrentUser(): Promise<User | null> {
  const token = getStoredToken();
  if (!token) return null;

  const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    removeStoredToken();
    return null;
  }
  return res.json();
}
