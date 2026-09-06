"use client";

import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  GitCommit,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  FileCode,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Incident } from "@/lib/api";

interface IncidentTableProps {
  incidents: Incident[];
  onSelectIncident: (inc: Incident) => void;
  onTriageStatus: (id: string, newStatus: "RESOLVED" | "DISMISSED") => void;
}

type SortField = "severity" | "rule_name" | "file_path" | "verification_status" | "commit_sha" | "last_seen_at";
type SortOrder = "asc" | "desc";

const SEVERITY_WEIGHTS: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export function IncidentTable({
  incidents,
  onSelectIncident,
  onTriageStatus,
}: IncidentTableProps) {
  const [sortField, setSortField] = useState<SortField>("last_seen_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder(field === "severity" || field === "last_seen_at" ? "desc" : "asc");
    }
    setCurrentPage(1);
  };

  const sortedIncidents = useMemo(() => {
    const list = [...incidents];
    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === "severity") {
        const weightA = SEVERITY_WEIGHTS[a.severity] || 0;
        const weightB = SEVERITY_WEIGHTS[b.severity] || 0;
        comparison = weightA - weightB;
      } else if (sortField === "last_seen_at") {
        comparison = new Date(a.last_seen_at).getTime() - new Date(b.last_seen_at).getTime();
      } else {
        const valA = String(a[sortField] || "").toLowerCase();
        const valB = String(b[sortField] || "").toLowerCase();
        comparison = valA.localeCompare(valB);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    return list;
  }, [incidents, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedIncidents.length / pageSize) || 1;
  const clampedPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (clampedPage - 1) * pageSize;
  const paginatedIncidents = sortedIncidents.slice(startIndex, startIndex + pageSize);

  const exportToCSV = () => {
    const headers = [
      "ID",
      "Rule ID",
      "Rule Name",
      "Severity",
      "Status",
      "Verification Status",
      "File Path",
      "Line Number",
      "Masked Snippet",
      "Commit SHA",
      "Committer",
      "First Seen",
      "Last Seen",
    ];

    const escapeCSV = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = sortedIncidents.map((inc) => [
      escapeCSV(inc.id),
      escapeCSV(inc.rule_id),
      escapeCSV(inc.rule_name),
      escapeCSV(inc.severity),
      escapeCSV(inc.status),
      escapeCSV(inc.verification_status),
      escapeCSV(inc.file_path),
      escapeCSV(inc.line_number),
      escapeCSV(inc.masked_snippet),
      escapeCSV(inc.commit_sha),
      escapeCSV(inc.committer_handle || ""),
      escapeCSV(inc.first_seen_at),
      escapeCSV(inc.last_seen_at),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `aegis-incidents-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(sortedIncidents, null, 2)
    )}`;
    const link = document.createElement("a");
    link.setAttribute("href", jsonString);
    link.setAttribute("download", `aegis-incidents-${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-muted/60 ml-1 inline-block" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="w-3 h-3 text-primary ml-1 inline-block" />
    ) : (
      <ArrowDown className="w-3 h-3 text-primary ml-1 inline-block" />
    );
  };

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
      {/* Table Subheader with Counter and Export Actions */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-subtle bg-canvas/30 text-xs">
        <div className="text-muted">
          Found <span className="font-semibold text-heading">{incidents.length}</span> incident{incidents.length === 1 ? "" : "s"}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={exportToCSV}
            title="Export filtered records to CSV"
            className="flex items-center space-x-1.5 px-2.5 py-1 text-[11px] font-medium text-heading bg-canvas hover:bg-subtle border border-subtle rounded-lg transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={exportToJSON}
            title="Export filtered records to JSON"
            className="flex items-center space-x-1.5 px-2.5 py-1 text-[11px] font-medium text-heading bg-canvas hover:bg-subtle border border-subtle rounded-lg transition-colors"
          >
            <FileCode className="w-3.5 h-3.5 text-primary" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" role="table">
          <thead>
            <tr className="bg-canvas border-b border-subtle text-[11px] font-semibold uppercase tracking-wider text-muted select-none">
              <th
                scope="col"
                onClick={() => handleSort("severity")}
                className="py-3.5 px-6 cursor-pointer hover:text-heading transition-colors"
              >
                <div className="flex items-center">
                  <span>Severity</span>
                  {renderSortIcon("severity")}
                </div>
              </th>
              <th
                scope="col"
                onClick={() => handleSort("rule_name")}
                className="py-3.5 px-6 cursor-pointer hover:text-heading transition-colors"
              >
                <div className="flex items-center">
                  <span>Rule & Secret Signature</span>
                  {renderSortIcon("rule_name")}
                </div>
              </th>
              <th
                scope="col"
                onClick={() => handleSort("file_path")}
                className="py-3.5 px-6 cursor-pointer hover:text-heading transition-colors"
              >
                <div className="flex items-center">
                  <span>Location</span>
                  {renderSortIcon("file_path")}
                </div>
              </th>
              <th scope="col" className="py-3.5 px-6">
                Masked Token
              </th>
              <th
                scope="col"
                onClick={() => handleSort("verification_status")}
                className="py-3.5 px-6 cursor-pointer hover:text-heading transition-colors"
              >
                <div className="flex items-center">
                  <span>Verification</span>
                  {renderSortIcon("verification_status")}
                </div>
              </th>
              <th
                scope="col"
                onClick={() => handleSort("commit_sha")}
                className="py-3.5 px-6 cursor-pointer hover:text-heading transition-colors"
              >
                <div className="flex items-center">
                  <span>Commit</span>
                  {renderSortIcon("commit_sha")}
                </div>
              </th>
              <th scope="col" className="py-3.5 px-6 text-right">
                Triage Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle text-xs">
            {paginatedIncidents.map((inc) => {
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
                        <a
                          href={`https://github.com/${inc.committer_handle.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] text-primary hover:underline inline-flex items-center space-x-0.5 font-mono"
                          title={`View @${inc.committer_handle.replace("@", "")} on GitHub`}
                        >
                          <span>(@{inc.committer_handle.replace("@", "")})</span>
                          <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-70" />
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Triage Actions */}
                  <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                    {!isResolved ? (
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTriageStatus(inc.id, "RESOLVED");
                          }}
                          title="Mark Resolved"
                          className="px-2.5 py-1 text-xs bg-canvas hover:bg-subtle text-heading border border-subtle rounded font-medium transition-colors cursor-pointer"
                        >
                          Resolve
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTriageStatus(inc.id, "DISMISSED");
                          }}
                          title="Dismiss as False Positive"
                          className="px-2.5 py-1 text-xs text-muted hover:text-heading hover:bg-canvas rounded transition-colors cursor-pointer"
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

      {/* Pagination Footer Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-t border-subtle bg-canvas/30 text-xs text-muted">
        <div className="flex items-center space-x-4">
          <span>
            Showing <span className="font-semibold text-heading">{Math.min(startIndex + 1, sortedIncidents.length)}</span> to{" "}
            <span className="font-semibold text-heading">{Math.min(startIndex + pageSize, sortedIncidents.length)}</span> of{" "}
            <span className="font-semibold text-heading">{sortedIncidents.length}</span> incidents
          </span>
          <div className="flex items-center space-x-1.5">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-surface border border-subtle text-heading text-xs rounded px-2 py-0.5 focus:outline-none focus:border-interactive"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={clampedPage <= 1}
            className="flex items-center space-x-1 px-2.5 py-1 bg-surface border border-subtle rounded text-heading hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>
          <span className="font-mono text-xs text-muted px-2">
            Page {clampedPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={clampedPage >= totalPages}
            className="flex items-center space-x-1 px-2.5 py-1 bg-surface border border-subtle rounded text-heading hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
