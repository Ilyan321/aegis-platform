"use client";

import React, { useEffect, useState } from "react";
import { X, ShieldAlert, History, Copy } from "lucide-react";
import { Incident, IncidentAudit, fetchIncidentAudits, updateIncidentStatus } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

interface IncidentDetailModalProps {
  incident: Incident | null;
  onClose: () => void;
  onStatusUpdated: (updated: Incident) => void;
}

export function IncidentDetailModal({
  incident,
  onClose,
  onStatusUpdated,
}: IncidentDetailModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [audits, setAudits] = useState<IncidentAudit[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (incident) {
      setLoadingAudits(true);
      fetchIncidentAudits(incident.id)
        .then(setAudits)
        .catch(() => setAudits([]))
        .finally(() => setLoadingAudits(false));
    }
  }, [incident]);

  // Keyboard dismiss (Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (incident) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [incident, onClose]);

  if (!incident) return null;

  const handleAction = async (newStatus: "RESOLVED" | "DISMISSED" | "OPEN") => {
    try {
      setUpdating(true);
      const updated = await updateIncidentStatus(incident.id, newStatus, undefined, user?.email);
      onStatusUpdated(updated);
      toast({
        type: newStatus === "RESOLVED" ? "success" : "info",
        title: `Incident marked as ${newStatus.toLowerCase()}`,
        description: `Audit trail updated for ${incident.rule_name}.`,
      });
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      type: "success",
      title: "Copied to clipboard",
      description: `${label} copied.`,
      duration: 2000,
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-heading/40 backdrop-blur-xs cursor-pointer"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="incident-detail-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-subtle rounded-xl w-full max-w-2xl overflow-hidden shadow-modal animate-in fade-in zoom-in-95 duration-150 cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-subtle bg-canvas">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-surface border border-subtle flex items-center justify-center text-primary">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span id="incident-detail-title" className="font-semibold text-heading text-base">{incident.rule_name}</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-surface border-subtle text-heading">
                  {incident.severity}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-subtle text-heading font-medium">
                  {incident.status}
                </span>
              </div>
              <span className="font-mono text-xs text-muted">{incident.rule_id}</span>
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

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-canvas border border-subtle rounded-lg p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-muted block mb-1">
                  Location
                </span>
                <span className="font-mono text-xs text-heading font-medium">
                  {incident.file_path}:{incident.line_number}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(`${incident.file_path}:${incident.line_number}`, "File path")}
                className="w-7 h-7 rounded hover:bg-surface border border-transparent hover:border-subtle flex items-center justify-center text-muted hover:text-heading transition-colors"
                title="Copy location"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="bg-canvas border border-subtle rounded-lg p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-muted block mb-1">
                  Commit & Author
                </span>
                <span className="font-mono text-xs text-heading">
                  {incident.commit_sha.slice(0, 7)}{" "}
                  {incident.committer_handle && `(@${incident.committer_handle})`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(incident.commit_sha, "Commit SHA")}
                className="w-7 h-7 rounded hover:bg-surface border border-transparent hover:border-subtle flex items-center justify-center text-muted hover:text-heading transition-colors"
                title="Copy full commit SHA"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Masked Secret Value */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-2">
              Masked Secret Token
            </span>
            <div className="bg-canvas border border-subtle rounded-lg p-3 flex items-center justify-between">
              <span className="font-mono text-xs text-heading select-all font-semibold">
                {incident.masked_snippet}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(incident.masked_snippet, "Masked snippet")}
                className="flex items-center space-x-1 text-[11px] font-medium text-muted hover:text-heading bg-surface hover:bg-subtle border border-subtle px-2.5 py-1 rounded transition-colors"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>
          </div>

          {/* Verification Probe Details */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-2">
              Provider Verification State
            </span>
            <div className="bg-canvas border border-subtle rounded-lg p-3.5 space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-heading">Status:</span>
                <span className="font-mono text-xs font-bold text-primary">
                  {incident.verification_status}
                </span>
              </div>
              {incident.verification_details && (
                <p className="text-xs text-muted leading-relaxed">
                  {incident.verification_details}
                </p>
              )}
            </div>
          </div>

          {/* Audit Trail */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <History className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Audit Timeline
              </span>
            </div>

            {loadingAudits ? (
              <div className="text-xs text-muted py-4 text-center">Loading audit records...</div>
            ) : audits.length === 0 ? (
              <div className="text-xs text-muted py-2">No historical audit changes recorded.</div>
            ) : (
              <div className="space-y-2.5">
                {audits.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start space-x-3 text-xs bg-canvas border border-subtle rounded-lg p-3"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-heading">{a.action}</span>
                        <span className="text-[10px] text-muted">
                          {new Date(a.created_at).toLocaleString()}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted">Actor: {a.actor_id}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-canvas border-t border-subtle flex items-center justify-between">
          <span className="text-[11px] font-mono text-muted">ID: {incident.id}</span>
          <div className="flex items-center space-x-2">
            {incident.status !== "RESOLVED" && (
              <button
                disabled={updating}
                onClick={() => handleAction("RESOLVED")}
                className="bg-primary hover:bg-heading text-surface px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Mark Resolved
              </button>
            )}
            {incident.status !== "DISMISSED" && (
              <button
                disabled={updating}
                onClick={() => handleAction("DISMISSED")}
                className="bg-surface hover:bg-subtle text-muted hover:text-heading border border-subtle px-4 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                Dismiss
              </button>
            )}
            {incident.status !== "OPEN" && (
              <button
                disabled={updating}
                onClick={() => handleAction("OPEN")}
                className="bg-surface hover:bg-subtle text-heading border border-subtle px-4 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                Re-open
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
