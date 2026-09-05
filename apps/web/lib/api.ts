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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchTelemetry(): Promise<TelemetryData> {
  const res = await fetch(`${API_BASE}/api/v1/telemetry`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch telemetry: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchRepositories(): Promise<Repository[]> {
  const res = await fetch(`${API_BASE}/api/v1/repositories`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch repositories: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchIncidents(filter?: {
  status?: string;
  severity?: string;
  repository_id?: string;
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
