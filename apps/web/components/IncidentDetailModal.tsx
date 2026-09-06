"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  ShieldAlert,
  ShieldCheck,
  History,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  FileCode,
  Lock,
  Sparkles,
  Share2,
  Clock,
  Database,
  Key,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Incident, IncidentAudit, fetchIncidentAudits, updateIncidentStatus } from "@/lib/api";
import { getRemediationPlaybook } from "@/lib/playbooks";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

interface IncidentDetailModalProps {
  incident: Incident | null;
  onClose: () => void;
  onStatusUpdated: (updated: Incident) => void;
}

type TabType = "overview" | "playbook" | "audit";

export function IncidentDetailModal({
  incident,
  onClose,
  onStatusUpdated,
}: IncidentDetailModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [audits, setAudits] = useState<IncidentAudit[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [actionReason, setActionReason] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch audits whenever incident changes
  useEffect(() => {
    if (incident) {
      setActiveTab("overview");
      setActionReason("");
      setLoadingAudits(true);
      fetchIncidentAudits(incident.id)
        .then(setAudits)
        .catch(() => setAudits([]))
        .finally(() => setLoadingAudits(false));
    }
  }, [incident]);

  // Keyboard accessibility (Escape to close, 1/2/3 for tabs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      } else if (e.key === "1") {
        setActiveTab("overview");
      } else if (e.key === "2") {
        setActiveTab("playbook");
      } else if (e.key === "3") {
        setActiveTab("audit");
      }
    };
    if (incident) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [incident, onClose]);

  const playbook = useMemo(() => {
    if (!incident) return null;
    return getRemediationPlaybook(incident);
  }, [incident]);

  if (!incident || !playbook) return null;

  const copyToClipboard = (text: string, label: string, keyId?: string) => {
    navigator.clipboard.writeText(text);
    if (keyId) {
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 2000);
    }
    toast({
      type: "success",
      title: "Copied to clipboard",
      description: `${label} copied.`,
      duration: 2500,
    });
  };

  const handleAction = async (newStatus: "RESOLVED" | "DISMISSED" | "OPEN") => {
    try {
      setUpdating(true);
      const reason = actionReason.trim() || undefined;
      const updated = await updateIncidentStatus(incident.id, newStatus, reason, user?.email);
      onStatusUpdated(updated);
      toast({
        type: newStatus === "RESOLVED" ? "success" : "info",
        title: `Incident marked as ${newStatus.toLowerCase()}`,
        description: reason
          ? `Audit updated with note: "${reason}"`
          : `Audit trail updated for ${incident.rule_name}.`,
      });
      setActionReason("");
      // Refresh audit trail
      fetchIncidentAudits(incident.id).then(setAudits).catch(() => {});
    } catch (err) {
      console.error(err);
      toast({
        type: "error",
        title: "Update failed",
        description: "Could not update status on control plane.",
      });
    } finally {
      setUpdating(false);
    }
  };

  const copySiemPayload = () => {
    const payload = {
      schema: "https://aegis-platform.dev/schemas/siem-v1.json",
      event_type: "SECRET_EXPOSURE_INCIDENT",
      timestamp: new Date().toISOString(),
      incident_id: incident.id,
      repository_id: incident.repository_id,
      rule_id: incident.rule_id,
      rule_name: incident.rule_name,
      severity: incident.severity,
      status: incident.status,
      verification_status: incident.verification_status,
      verification_details: incident.verification_details || null,
      file_path: incident.file_path,
      line_number: incident.line_number,
      masked_snippet: incident.masked_snippet,
      commit_sha: incident.commit_sha,
      committer_handle: incident.committer_handle || null,
      fingerprint_sha256: incident.fingerprint,
      blind_index_hmac: incident.secret_hash || null,
      first_seen_at: incident.first_seen_at,
      last_seen_at: incident.last_seen_at,
      resolved_at: incident.resolved_at || null,
      agent: "Aegis Zero-Dependency DevSecOps Intercept Mesh",
    };
    copyToClipboard(JSON.stringify(payload, null, 2), "SIEM Event JSON", "siem-json");
  };

  // Language badge helper
  const getLanguageTag = (filePath: string) => {
    const ext = filePath.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "ts":
      case "tsx":
        return "TypeScript";
      case "js":
      case "jsx":
        return "JavaScript";
      case "py":
        return "Python";
      case "go":
        return "Go";
      case "json":
        return "JSON";
      case "yml":
      case "yaml":
        return "YAML";
      case "env":
        return "DotEnv";
      case "sh":
      case "bash":
        return "Shell";
      default:
        return "Code";
    }
  };

  // Severity color tokens
  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case "CRITICAL":
        return {
          badge: "bg-danger/10 text-danger border-danger/20",
          icon: "text-danger",
        };
      case "HIGH":
        return {
          badge: "bg-warning/10 text-warning border-warning/20",
          icon: "text-warning",
        };
      case "MEDIUM":
        return {
          badge: "bg-primary/10 text-primary border-primary/20",
          icon: "text-primary",
        };
      default:
        return {
          badge: "bg-subtle text-muted border-subtle",
          icon: "text-muted",
        };
    }
  };

  const sevStyle = getSeverityStyle(incident.severity);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-heading/50 backdrop-blur-xs cursor-pointer animate-in fade-in duration-200"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="incident-detail-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-subtle rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 cursor-default flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle bg-canvas">
          <div className="flex items-center space-x-3.5">
            <div className={`w-10 h-10 rounded-xl bg-surface border border-subtle flex items-center justify-center ${sevStyle.icon}`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span id="incident-detail-title" className="font-semibold text-heading text-base tracking-tight">
                  {incident.rule_name}
                </span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${sevStyle.badge}`}>
                  {incident.severity}
                </span>
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                    incident.status === "RESOLVED"
                      ? "bg-primary/10 text-primary border-primary/20"
                      : incident.status === "DISMISSED"
                      ? "bg-subtle text-muted border-subtle"
                      : "bg-warning/10 text-warning border-warning/20"
                  }`}
                >
                  {incident.status}
                </span>
              </div>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="font-mono text-xs text-muted">{incident.rule_id}</span>
                <span className="text-muted text-xs">•</span>
                <span className="text-xs text-muted font-mono">{incident.file_path}:{incident.line_number}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-lg bg-surface hover:bg-subtle border border-subtle flex items-center justify-center text-muted hover:text-heading transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Apple Segmented Control Tabs */}
        <div className="px-6 pt-3 pb-2 bg-canvas border-b border-subtle flex items-center justify-between">
          <div className="flex items-center p-1 bg-surface border border-subtle rounded-xl space-x-1">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "overview"
                  ? "bg-canvas text-heading shadow-xs font-semibold"
                  : "text-muted hover:text-heading"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Overview & Code</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("playbook")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "playbook"
                  ? "bg-canvas text-heading shadow-xs font-semibold"
                  : "text-muted hover:text-heading"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Remediation Playbook</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold">
                {playbook.vendor.split(" ")[0]}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("audit")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "audit"
                  ? "bg-canvas text-heading shadow-xs font-semibold"
                  : "text-muted hover:text-heading"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit & SIEM</span>
              {audits.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-subtle text-muted font-bold">
                  {audits.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={copySiemPayload}
              title="Copy SIEM ingestion payload (JSON)"
              className="flex items-center space-x-1.5 text-xs text-muted hover:text-heading px-2.5 py-1.5 rounded-lg border border-subtle bg-surface hover:bg-subtle transition-colors"
            >
              {copiedKey === "siem-json" ? (
                <Check className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Export SIEM</span>
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-surface">
          {/* ========================================================================= */}
          {/* TAB 1: OVERVIEW & FORENSIC CODE SNIPPET */}
          {/* ========================================================================= */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Metadata Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="bg-canvas border border-subtle rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-muted block mb-0.5">
                      File Location
                    </span>
                    <span className="font-mono text-xs text-heading font-medium break-all">
                      {incident.file_path}:{incident.line_number}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`${incident.file_path}:${incident.line_number}`, "File path", "meta-path")}
                    className="w-7 h-7 rounded-lg hover:bg-surface border border-transparent hover:border-subtle flex items-center justify-center text-muted hover:text-heading transition-colors shrink-0"
                    title="Copy location"
                  >
                    {copiedKey === "meta-path" ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="bg-canvas border border-subtle rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-muted block mb-0.5">
                      Origin Commit & Committer
                    </span>
                    <div className="flex items-center space-x-1.5 font-mono text-xs text-heading">
                      <span>{incident.commit_sha.slice(0, 7)}</span>
                      {incident.committer_handle && (
                        <a
                          href={`https://github.com/${incident.committer_handle.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center space-x-1 font-mono"
                          title={`View @${incident.committer_handle.replace("@", "")} on GitHub`}
                        >
                          <span>(@{incident.committer_handle.replace("@", "")})</span>
                          <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(incident.commit_sha, "Full commit SHA", "meta-sha")}
                    className="w-7 h-7 rounded-lg hover:bg-surface border border-transparent hover:border-subtle flex items-center justify-center text-muted hover:text-heading transition-colors shrink-0"
                    title="Copy full commit SHA"
                  >
                    {copiedKey === "meta-sha" ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Forensic Code Snippet Window */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center space-x-1.5">
                    <FileCode className="w-3.5 h-3.5 text-primary" />
                    <span>Forensic Code Context</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-mono text-muted">
                      Line {incident.line_number}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(incident.masked_snippet, "Masked snippet", "code-snippet")}
                      className="flex items-center space-x-1 text-[11px] font-medium text-muted hover:text-heading bg-canvas hover:bg-subtle border border-subtle px-2 py-1 rounded-md transition-colors"
                    >
                      {copiedKey === "code-snippet" ? (
                        <Check className="w-3 h-3 text-primary" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Copy Line</span>
                    </button>
                  </div>
                </div>

                {/* macOS Xcode-style Dark Code Panel */}
                <div className="bg-[#0D1514] border border-[#1E302E] rounded-xl overflow-hidden shadow-inner font-mono text-xs">
                  {/* Editor Window Header */}
                  <div className="flex items-center justify-between px-3.5 py-2 bg-[#090F0E] border-b border-[#1E302E] text-[11px] text-[#7A9995]">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]/80" />
                      </div>
                      <span className="text-[#A5C4C0] font-mono text-[11px] ml-2">
                        {incident.file_path}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#132220] text-[#4FD1C5] border border-[#1E3A36]">
                      {getLanguageTag(incident.file_path)}
                    </span>
                  </div>

                  {/* Code Lines Container */}
                  <div className="p-3 text-[#CBD5E1] space-y-1 overflow-x-auto">
                    {/* Simulated Context Line Before (N-1) */}
                    {incident.line_number > 1 && (
                      <div className="flex items-center space-x-3 text-[#4A6460] select-none opacity-60">
                        <span className="w-8 text-right shrink-0">{incident.line_number - 1}</span>
                        <span className="text-[#64748B]">{"// Configuration and authentication credentials"}</span>
                      </div>
                    )}

                    {/* Breach Line (N) */}
                    <div className="flex items-center space-x-3 bg-[#E53E3E]/15 -mx-3 px-3 py-1 border-l-3 border-[#E53E3E]">
                      <span className="w-8 text-right shrink-0 font-bold text-[#FC8181] select-none">
                        {incident.line_number}
                      </span>
                      <div className="flex items-center space-x-2 text-[#F7FAFC] flex-wrap">
                        <span className="text-[#F687B3]">const</span>
                        <span className="text-[#90CDF4]">{incident.rule_id.toLowerCase()}</span>
                        <span className="text-[#E2E8F0]">=</span>
                        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#9B2C2C]/50 border border-[#E53E3E]/50 text-[#FED7D7] font-semibold">
                          <Lock className="w-3 h-3 text-[#FC8181]" />
                          <span>&quot;{incident.masked_snippet}&quot;</span>
                        </span>
                        <span className="text-[#E2E8F0] font-sans text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.2 rounded bg-[#E53E3E]/30 text-[#FEB2B2]">
                          LEAK
                        </span>
                      </div>
                    </div>

                    {/* Simulated Context Line After (N+1) */}
                    <div className="flex items-center space-x-3 text-[#4A6460] select-none opacity-60">
                      <span className="w-8 text-right shrink-0">{incident.line_number + 1}</span>
                      <span className="text-[#64748B]">{"// End of credential declaration"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Provider Verification Probe */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-2">
                  Provider Live Verification Probe
                </span>
                <div className="bg-canvas border border-subtle rounded-xl p-4 flex items-start space-x-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      incident.verification_status === "ACTIVE"
                        ? "bg-danger/10 text-danger border border-danger/20"
                        : incident.verification_status === "REVOKED"
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-subtle text-muted border border-subtle"
                    }`}
                  >
                    {incident.verification_status === "ACTIVE" ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : incident.verification_status === "REVOKED" ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-heading">Verification Status:</span>
                      <span
                        className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                          incident.verification_status === "ACTIVE"
                            ? "bg-danger/10 text-danger"
                            : incident.verification_status === "REVOKED"
                            ? "bg-primary/10 text-primary"
                            : "bg-subtle text-muted"
                        }`}
                      >
                        {incident.verification_status}
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed mt-1">
                      {incident.verification_details ||
                        (incident.verification_status === "ACTIVE"
                          ? "Aegis zero-knowledge verification probe confirmed this credential is live and active with the provider."
                          : "Provider probe did not detect active validity or probe is not applicable.")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-canvas border border-subtle rounded-xl p-3.5">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted block mb-0.5">First Detected</span>
                  <span className="text-heading font-medium">{new Date(incident.first_seen_at).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted block mb-0.5">Last Observed</span>
                  <span className="text-heading font-medium">{new Date(incident.last_seen_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: REMEDIATION PLAYBOOK ENGINE */}
          {/* ========================================================================= */}
          {activeTab === "playbook" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Playbook Vendor Banner */}
              <div className="bg-canvas border border-subtle rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-heading text-sm">{playbook.vendor}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface border border-subtle text-muted">
                        {playbook.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-0.5 max-w-lg leading-relaxed">
                      {playbook.summary}
                    </p>
                  </div>
                </div>

                {playbook.dashboardUrl && (
                  <a
                    href={playbook.dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-heading text-surface hover:opacity-90 transition-opacity shrink-0"
                  >
                    <span>{playbook.dashboardLabel || "Open Provider Portal"}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Step-by-Step Remediation Plan */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center space-x-1.5">
                    <Terminal className="w-3.5 h-3.5 text-primary" />
                    <span>Containment & Rotation Playbook</span>
                  </span>
                  <a
                    href={playbook.documentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-primary hover:underline flex items-center space-x-1"
                  >
                    <span>Official Vendor Docs</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="space-y-3">
                  {playbook.steps.map((s) => (
                    <div
                      key={s.step}
                      className="bg-canvas border border-subtle rounded-xl p-4 space-y-2.5 transition-colors hover:border-subtle"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2.5">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {s.step}
                          </span>
                          <div>
                            <span className="font-semibold text-heading text-xs block">{s.title}</span>
                            <span className="text-xs text-muted leading-relaxed">{s.description}</span>
                          </div>
                        </div>

                        {s.portalUrl && (
                          <a
                            href={s.portalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-medium text-primary hover:underline flex items-center space-x-1 shrink-0 ml-2"
                          >
                            <span>{s.portalLabel || "Open Console"}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {/* Interactive Terminal Command Box */}
                      {s.commandTemplate && (
                        <div className="bg-[#090F0E] border border-[#1E302E] rounded-lg p-2.5 flex items-center justify-between text-xs font-mono text-[#CBD5E1]">
                          <span className="truncate pr-2 select-all text-[#A5C4C0]">
                            $ {s.commandTemplate}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(s.commandTemplate!, s.title, `step-${s.step}`)}
                            className="flex items-center space-x-1 text-[10px] font-medium text-[#7A9995] hover:text-[#E2E8F0] bg-[#132220] hover:bg-[#1A2E2B] px-2 py-1 rounded border border-[#1E3A36] transition-colors shrink-0"
                          >
                            {copiedKey === `step-${s.step}` ? (
                              <Check className="w-3 h-3 text-[#4FD1C5]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>Copy</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Git History Scrubbing Guide */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center space-x-1.5 mb-2.5">
                  <Database className="w-3.5 h-3.5 text-primary" />
                  <span>Permanent Git History Neutralization</span>
                </span>
                <div className="bg-canvas border border-subtle rounded-xl p-4 space-y-3">
                  <p className="text-xs text-muted leading-relaxed">
                    {playbook.gitScrubbing.notice}
                  </p>
                  <div className="bg-[#090F0E] border border-[#1E302E] rounded-lg p-3 space-y-2 font-mono text-xs text-[#CBD5E1]">
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#1E302E] text-[10px] text-[#7A9995]">
                      <span>TOOL: {playbook.gitScrubbing.recommendedTool.toUpperCase()}</span>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            playbook.gitScrubbing.commands.join("\n"),
                            "Git scrubbing script",
                            "git-scrub"
                          )
                        }
                        className="text-[10px] text-[#7A9995] hover:text-[#E2E8F0] flex items-center space-x-1"
                      >
                        {copiedKey === "git-scrub" ? (
                          <Check className="w-3 h-3 text-[#4FD1C5]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>Copy Commands</span>
                      </button>
                    </div>
                    {playbook.gitScrubbing.commands.map((cmd, idx) => (
                      <div key={idx} className="truncate select-all text-[#A5C4C0]">
                        $ {cmd}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: AUDIT TRAIL & SIEM INTEGRATION */}
          {/* ========================================================================= */}
          {activeTab === "audit" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Lifecycle Visual Progress Stepper */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-3">
                  Incident Lifecycle Status
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-canvas border border-subtle rounded-xl p-3 text-center">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold inline-flex items-center justify-center mb-1">
                      1
                    </span>
                    <span className="text-xs font-semibold text-heading block">Discovery</span>
                    <span className="text-[10px] text-muted">
                      {new Date(incident.first_seen_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="bg-canvas border border-subtle rounded-xl p-3 text-center">
                    <span
                      className={`w-6 h-6 rounded-full text-xs font-bold inline-flex items-center justify-center mb-1 ${
                        incident.verification_status === "ACTIVE"
                          ? "bg-danger/10 text-danger"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      2
                    </span>
                    <span className="text-xs font-semibold text-heading block">Verification</span>
                    <span className="text-[10px] text-muted font-mono">{incident.verification_status}</span>
                  </div>
                  <div className="bg-canvas border border-subtle rounded-xl p-3 text-center">
                    <span
                      className={`w-6 h-6 rounded-full text-xs font-bold inline-flex items-center justify-center mb-1 ${
                        incident.status === "RESOLVED"
                          ? "bg-primary text-surface"
                          : "bg-subtle text-muted"
                      }`}
                    >
                      3
                    </span>
                    <span className="text-xs font-semibold text-heading block">Resolution</span>
                    <span className="text-[10px] text-muted font-mono">{incident.status}</span>
                  </div>
                </div>
              </div>

              {/* SIEM & Forensic Hashes Card */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    <span>SIEM Forensic Fingerprints</span>
                  </span>
                  <button
                    type="button"
                    onClick={copySiemPayload}
                    className="flex items-center space-x-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>Export CEF/JSON Payload</span>
                  </button>
                </div>

                <div className="bg-canvas border border-subtle rounded-xl divide-y divide-subtle font-mono text-xs">
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted block font-sans">
                        Forensic Fingerprint (SHA-256)
                      </span>
                      <span className="text-heading select-all break-all">{incident.fingerprint}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(incident.fingerprint, "SHA-256 Fingerprint", "fp")}
                      className="w-7 h-7 rounded hover:bg-surface flex items-center justify-center text-muted hover:text-heading transition-colors ml-2 shrink-0"
                    >
                      {copiedKey === "fp" ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted block font-sans">
                        Blind Index Peppered Hash (HMAC-SHA256)
                      </span>
                      <span className="text-heading select-all break-all">{incident.secret_hash || "Calculated at scan time"}</span>
                    </div>
                    {incident.secret_hash && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(incident.secret_hash!, "Secret Hash", "sh")}
                        className="w-7 h-7 rounded hover:bg-surface flex items-center justify-center text-muted hover:text-heading transition-colors ml-2 shrink-0"
                      >
                        {copiedKey === "sh" ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted block font-sans">
                        Repository Control Plane ID
                      </span>
                      <span className="text-heading select-all">{incident.repository_id}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(incident.repository_id, "Repository ID", "repoid")}
                      className="w-7 h-7 rounded hover:bg-surface flex items-center justify-center text-muted hover:text-heading transition-colors ml-2 shrink-0"
                    >
                      {copiedKey === "repoid" ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Historical Audit Trail Records */}
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <History className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Append-Only Audit Trail
                  </span>
                </div>

                {loadingAudits ? (
                  <div className="text-xs text-muted py-6 text-center">Loading audit records...</div>
                ) : audits.length === 0 ? (
                  <div className="text-xs text-muted py-4 text-center bg-canvas border border-subtle rounded-xl">
                    No historical modifications recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {audits.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-start space-x-3 text-xs bg-canvas border border-subtle rounded-xl p-3.5 transition-colors"
                      >
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-heading">{a.action}</span>
                            <span className="text-[10px] text-muted">
                              {new Date(a.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted mt-0.5">
                            Operator: <span className="font-medium text-heading">{a.actor_id}</span>
                          </div>
                          {a.new_state && typeof a.new_state === "object" && (
                            <div className="mt-2 text-[11px] bg-surface border border-subtle rounded-lg p-2 font-mono text-muted">
                              {Boolean(a.new_state.reason) && (
                                <div className="text-heading font-sans mb-1">
                                  Note: &quot;{String(a.new_state.reason)}&quot;
                                </div>
                              )}
                              <div>Status: {String(a.new_state.status ?? "N/A")}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-canvas border-t border-subtle flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Operator resolution note (optional)..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded-lg bg-surface border border-subtle text-heading placeholder:text-muted focus:outline-hidden focus:border-primary transition-colors"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 shrink-0">
            {incident.status !== "RESOLVED" && (
              <button
                disabled={updating}
                onClick={() => handleAction("RESOLVED")}
                className="bg-primary hover:bg-heading text-surface px-4 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {updating ? "Saving..." : "Mark Resolved"}
              </button>
            )}
            {incident.status !== "DISMISSED" && (
              <button
                disabled={updating}
                onClick={() => handleAction("DISMISSED")}
                className="bg-surface hover:bg-subtle text-muted hover:text-heading border border-subtle px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                Dismiss
              </button>
            )}
            {incident.status !== "OPEN" && (
              <button
                disabled={updating}
                onClick={() => handleAction("OPEN")}
                className="bg-surface hover:bg-subtle text-heading border border-subtle px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                Re-open Incident
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
