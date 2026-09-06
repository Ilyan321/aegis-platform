"use client";

import React, { useState } from "react";
import { Activity, GitCommit, GitBranch, ShieldAlert, CheckCircle2, Clock, AlertTriangle, RefreshCw, Terminal, Play, GitFork } from "lucide-react";
import { ScanRun, Repository } from "@/lib/api";

interface ScansViewProps {
  scans: ScanRun[];
  repositories: Repository[];
  loading?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function ScansView({
  scans,
  repositories,
  loading = false,
  onRefresh,
  isRefreshing = false,
}: ScansViewProps) {
  const [filterRepo, setFilterRepo] = useState<string>("ALL");

  const repoMap = new Map(repositories.map((r) => [r.id, r.full_name]));

  const filteredScans = scans.filter((s) => {
    if (filterRepo !== "ALL" && s.repository_id !== filterRepo) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* View Header & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          {repositories.length > 0 && (
            <select
              value={filterRepo}
              onChange={(e) => setFilterRepo(e.target.value)}
              className="text-xs bg-surface border border-subtle rounded-lg px-3 py-1.5 text-heading focus:outline-none focus:ring-2 focus:ring-interactive"
            >
              <option value="ALL">All Repositories</option>
              {repositories.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.full_name}
                </option>
              ))}
            </select>
          )}
          <span className="text-xs text-muted font-medium">
            {filteredScans.length} {filteredScans.length === 1 ? "scan run" : "scan runs"} recorded
          </span>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center space-x-1.5 text-xs text-muted hover:text-heading px-3 py-1.5 rounded-lg border border-subtle bg-surface hover:bg-canvas transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span>Refresh Scans</span>
          </button>
        )}
      </div>

      {/* Scans Ledger or Empty State */}
      {loading ? (
        <div className="bg-surface border border-subtle rounded-xl p-8 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 rounded shimmer-placeholder" />
          ))}
        </div>
      ) : filteredScans.length === 0 ? (
        <div className="bg-surface border border-subtle rounded-xl p-16 text-center shadow-subtle">
          <div className="w-12 h-12 rounded-xl bg-canvas border border-subtle flex items-center justify-center text-primary mx-auto mb-4">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-heading mb-1">No Scan Activity Recorded</h3>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Automated scan runs will appear here as webhooks trigger secret inspection on Git pushes, PR commits, and local CLI streams.
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-subtle rounded-xl overflow-hidden shadow-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-canvas border-b border-subtle text-[11px] font-semibold uppercase tracking-wider text-muted">
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Source</th>
                  <th className="py-3.5 px-6">Repository</th>
                  <th className="py-3.5 px-6">Commit & Branch</th>
                  <th className="py-3.5 px-6">Files Scanned</th>
                  <th className="py-3.5 px-6">Duration</th>
                  <th className="py-3.5 px-6">Findings</th>
                  <th className="py-3.5 px-6 text-right">Executed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle text-xs">
                {filteredScans.map((scan) => {
                  const repoName = repoMap.get(scan.repository_id) || "Repository";
                  const hasLeaks = scan.active_leaks_count > 0;
                  const isSuccess = scan.status === "COMPLETED";

                  return (
                    <tr key={scan.id} className="hover:bg-canvas/40 transition-colors">
                      {/* Status */}
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          {isSuccess ? (
                            <span className="inline-flex items-center space-x-1 text-primary text-xs font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Completed</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-heading text-xs font-medium">
                              <AlertTriangle className="w-3.5 h-3.5 text-primary" />
                              <span>{scan.status}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-4 px-6">
                        {scan.trigger_source === "cli" ? (
                          <span className="inline-flex items-center space-x-1 bg-canvas border border-subtle text-heading px-2 py-0.5 rounded text-[11px] font-medium font-mono shadow-xs">
                            <Terminal className="w-3 h-3 text-primary" />
                            <span>Source: Local CLI</span>
                          </span>
                        ) : scan.trigger_source === "webhook" ? (
                          <span className="inline-flex items-center space-x-1 bg-canvas border border-subtle text-muted px-2 py-0.5 rounded text-[11px] font-medium">
                            <GitFork className="w-3 h-3 text-primary" />
                            <span>Webhook</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 bg-canvas border border-subtle text-muted px-2 py-0.5 rounded text-[11px] font-medium">
                            <Play className="w-3 h-3 text-primary fill-current" />
                            <span>On Demand</span>
                          </span>
                        )}
                      </td>

                      {/* Repository */}
                      <td className="py-4 px-6 font-semibold text-heading">
                        {repoName}
                      </td>

                      {/* Commit & Branch */}
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2 font-mono text-xs">
                          <span className="inline-flex items-center space-x-1 bg-canvas border border-subtle px-2 py-0.5 rounded text-heading">
                            <GitCommit className="w-3 h-3 text-muted" />
                            <span>{scan.commit_sha.slice(0, 7)}</span>
                          </span>
                          <span className="inline-flex items-center space-x-1 text-muted text-[11px]">
                            <GitBranch className="w-3 h-3" />
                            <span>{scan.branch}</span>
                          </span>
                        </div>
                      </td>

                      {/* Files Scanned */}
                      <td className="py-4 px-6 font-mono text-xs text-muted">
                        {scan.files_scanned} files
                      </td>

                      {/* Duration */}
                      <td className="py-4 px-6">
                        <div className="inline-flex items-center space-x-1 font-mono text-xs text-muted">
                          <Clock className="w-3 h-3 text-muted" />
                          <span>{scan.duration_ms}ms</span>
                        </div>
                      </td>

                      {/* Findings */}
                      <td className="py-4 px-6">
                        {hasLeaks ? (
                          <span className="inline-flex items-center space-x-1 bg-accent border border-interactive text-heading px-2 py-0.5 rounded text-[11px] font-bold">
                            <ShieldAlert className="w-3 h-3" />
                            <span>{scan.active_leaks_count} active leak</span>
                          </span>
                        ) : scan.total_findings > 0 ? (
                          <span className="inline-flex items-center space-x-1 bg-subtle text-heading px-2 py-0.5 rounded text-[11px] font-semibold">
                            <span>{scan.total_findings} findings</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted font-medium">
                            Clean (0 findings)
                          </span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="py-4 px-6 text-right font-mono text-[11px] text-muted">
                        {new Date(scan.created_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
