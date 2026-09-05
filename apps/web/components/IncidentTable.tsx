"use client";

import React from "react";
import { CheckCircle2, ShieldCheck, AlertTriangle, GitCommit } from "lucide-react";
import { Incident } from "@/lib/api";

interface IncidentTableProps {
  incidents: Incident[];
  onSelectIncident: (inc: Incident) => void;
  onTriageStatus: (id: string, newStatus: "RESOLVED" | "DISMISSED") => void;
}

export function IncidentTable({
  incidents,
  onSelectIncident,
  onTriageStatus,
}: IncidentTableProps) {
  if (incidents.length === 0) {
    return (
      <div className="bg-surface border border-subtle rounded-xl p-16 text-center">
        <div className="w-12 h-12 rounded-xl bg-canvas border border-subtle flex items-center justify-center text-primary mx-auto mb-4">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-heading mb-1">Zero Security Incidents</h3>
        <p className="text-xs text-muted max-w-sm mx-auto">
          No policy-violating secrets or active credential leaks detected across monitored repositories.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-subtle rounded-xl overflow-hidden shadow-none">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-canvas border-b border-subtle text-[11px] font-semibold uppercase tracking-wider text-muted">
              <th className="py-3.5 px-6">Severity</th>
              <th className="py-3.5 px-6">Rule & Secret Signature</th>
              <th className="py-3.5 px-6">Location</th>
              <th className="py-3.5 px-6">Masked Token</th>
              <th className="py-3.5 px-6">Verification</th>
              <th className="py-3.5 px-6">Commit</th>
              <th className="py-3.5 px-6 text-right">Triage Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle text-xs">
            {incidents.map((inc) => {
              // Severity badge color mapping
              let severityBadge = "bg-canvas text-muted border-subtle";
              if (inc.severity === "CRITICAL") {
                severityBadge = "bg-accent text-heading font-bold border-interactive";
              } else if (inc.severity === "HIGH") {
                severityBadge = "bg-subtle text-heading font-semibold border-subtle";
              }

              // Status styling
              const isResolved = inc.status === "RESOLVED" || inc.status === "DISMISSED";
              const isRegression = inc.status === "REGRESSION";

              return (
                <tr
                  key={inc.id}
                  onClick={() => onSelectIncident(inc)}
                  className="hover:bg-canvas/50 transition-colors cursor-pointer group"
                >
                  {/* Severity */}
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${severityBadge}`}
                      >
                        {inc.severity}
                      </span>
                      {isRegression && (
                        <span className="text-[10px] bg-primary text-surface px-1.5 py-0.5 rounded font-bold">
                          REGRESSION
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Rule Name */}
                  <td className="py-4 px-6">
                    <div>
                      <div className="font-semibold text-heading group-hover:text-primary transition-colors">
                        {inc.rule_name}
                      </div>
                      <div className="text-[11px] text-muted font-mono">{inc.rule_id}</div>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="py-4 px-6">
                    <div className="font-mono text-xs text-heading">
                      {inc.file_path}
                      <span className="text-muted">:{inc.line_number}</span>
                    </div>
                  </td>

                  {/* Masked Snippet */}
                  <td className="py-4 px-6">
                    <span className="font-mono text-[11px] bg-canvas border border-subtle px-2.5 py-1 rounded text-heading">
                      {inc.masked_snippet}
                    </span>
                  </td>

                  {/* Verification Status */}
                  <td className="py-4 px-6">
                    {inc.verification_status === "ACTIVE" ? (
                      <span className="inline-flex items-center space-x-1.5 bg-accent text-heading border border-interactive px-2 py-0.5 rounded text-[11px] font-bold">
                        <AlertTriangle className="w-3 h-3" />
                        <span>ACTIVE LEAK</span>
                      </span>
                    ) : inc.verification_status === "REVOKED" ? (
                      <span className="inline-flex items-center space-x-1 bg-subtle text-muted border border-subtle px-2 py-0.5 rounded text-[11px]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Revoked</span>
                      </span>
                    ) : (
                      <span className="text-muted text-[11px] font-mono">
                        {inc.verification_status}
                      </span>
                    )}
                  </td>

                  {/* Commit & Author */}
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-1.5 text-muted">
                      <GitCommit className="w-3.5 h-3.5 text-muted" />
                      <span className="font-mono text-xs">{inc.commit_sha.slice(0, 7)}</span>
                      {inc.committer_handle && (
                        <span className="text-[11px]">(@{inc.committer_handle})</span>
                      )}
                    </div>
                  </td>

                  {/* Triage Actions */}
                  <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                    {!isResolved ? (
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onTriageStatus(inc.id, "RESOLVED")}
                          title="Mark Resolved"
                          className="px-2.5 py-1 text-xs bg-canvas hover:bg-subtle text-heading border border-subtle rounded font-medium transition-colors"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => onTriageStatus(inc.id, "DISMISSED")}
                          title="Dismiss as False Positive"
                          className="px-2.5 py-1 text-xs text-muted hover:text-heading hover:bg-canvas rounded transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted font-medium italic">
                        {inc.status}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
