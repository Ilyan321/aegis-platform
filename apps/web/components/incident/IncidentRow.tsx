"use client";

import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  GitCommit,
  ExternalLink,
  CheckSquare,
  Square,
  Trash2,
} from "lucide-react";
import { Incident } from "@/lib/api";

interface IncidentRowProps {
  incident: Incident;
  isSelected: boolean;
  isFocused: boolean;
  onSelect: () => void;
  onToggleCheck: (e: React.MouseEvent) => void;
  onTriageStatus: (id: string, newStatus: "RESOLVED" | "DISMISSED") => void;
  onDeleteIncident?: (id: string) => Promise<void>;
}

export function IncidentRow({
  incident,
  isSelected,
  isFocused,
  onSelect,
  onToggleCheck,
  onTriageStatus,
  onDeleteIncident,
}: IncidentRowProps) {
  // Severity badge color mapping
  let severityBadge = "bg-canvas text-muted border-subtle";
  if (incident.severity === "CRITICAL") {
    severityBadge = "bg-accent text-heading font-bold border-interactive";
  } else if (incident.severity === "HIGH") {
    severityBadge = "bg-subtle text-heading font-semibold border-subtle";
  }

  // Status styling
  const isResolved = incident.status === "RESOLVED" || incident.status === "DISMISSED";
  const isRegression = incident.status === "REGRESSION";

  return (
    <tr
      onClick={onSelect}
      className={`transition-colors cursor-pointer group relative ${
        isSelected
          ? "bg-primary/5 hover:bg-primary/10"
          : isFocused
          ? "bg-canvas/80 ring-1 ring-primary/40 ring-inset"
          : "hover:bg-canvas/50"
      }`}
    >
      {/* Checkbox */}
      <td
        className="py-4 px-4 text-center"
        onClick={onToggleCheck}
      >
        <button
          type="button"
          className="p-1 rounded text-muted hover:text-heading focus:outline-hidden transition-colors cursor-pointer"
          title={isSelected ? "Deselect" : "Select row (x)"}
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-primary" />
          ) : (
            <Square className="w-4 h-4 text-muted/40 group-hover:text-muted transition-colors" />
          )}
        </button>
      </td>

      {/* Severity */}
      <td className="py-4 px-4">
        <div className="flex items-center space-x-2">
          <span
            className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${severityBadge}`}
          >
            {incident.severity}
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
            {incident.rule_name}
          </div>
          <div className="text-[11px] text-muted font-mono">{incident.rule_id}</div>
        </div>
      </td>

      {/* Location */}
      <td className="py-4 px-6">
        <div className="font-mono text-xs text-heading">
          {incident.file_path}
          <span className="text-muted">:{incident.line_number}</span>
        </div>
      </td>

      {/* Masked Snippet */}
      <td className="py-4 px-6">
        <span className="font-mono text-[11px] bg-canvas border border-subtle px-2.5 py-1 rounded text-heading">
          {incident.masked_snippet}
        </span>
      </td>

      {/* Verification Status */}
      <td className="py-4 px-6">
        {incident.verification_status === "ACTIVE" ? (
          <span className="inline-flex items-center space-x-1.5 bg-accent text-heading border border-interactive px-2 py-0.5 rounded text-[11px] font-bold">
            <AlertTriangle className="w-3 h-3" />
            <span>ACTIVE LEAK</span>
          </span>
        ) : incident.verification_status === "REVOKED" ? (
          <span className="inline-flex items-center space-x-1 bg-subtle text-muted border border-subtle px-2 py-0.5 rounded text-[11px]">
            <CheckCircle2 className="w-3 h-3" />
            <span>Revoked</span>
          </span>
        ) : (
          <span className="text-muted text-[11px] font-mono">
            {incident.verification_status}
          </span>
        )}
      </td>

      {/* Commit & Author */}
      <td className="py-4 px-6">
        <div className="flex items-center space-x-1.5 text-muted">
          <GitCommit className="w-3.5 h-3.5 text-muted" />
          <span className="font-mono text-xs">{incident.commit_sha.slice(0, 7)}</span>
          {incident.committer_handle && (
            <a
              href={`https://github.com/${incident.committer_handle.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-primary hover:underline inline-flex items-center space-x-0.5 font-mono"
              title={`View @${incident.committer_handle.replace("@", "")} on GitHub`}
            >
              <span>(@{incident.committer_handle.replace("@", "")})</span>
              <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-70" />
            </a>
          )}
        </div>
      </td>

      {/* Triage Actions */}
      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end space-x-1.5">
          {!isResolved ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTriageStatus(incident.id, "RESOLVED");
                }}
                title="Mark Resolved (e)"
                className="px-2.5 py-1 text-xs bg-canvas hover:bg-subtle text-heading border border-subtle rounded-lg font-medium transition-colors cursor-pointer"
              >
                Resolve
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTriageStatus(incident.id, "DISMISSED");
                }}
                title="Dismiss as False Positive"
                className="px-2.5 py-1 text-xs text-muted hover:text-heading hover:bg-canvas rounded-lg transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </>
          ) : (
            <span className="text-[11px] text-muted font-medium italic mr-1">
              {incident.status}
            </span>
          )}
          {onDeleteIncident && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteIncident(incident.id);
              }}
              title="Delete Incident"
              className="p-1 text-muted hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
