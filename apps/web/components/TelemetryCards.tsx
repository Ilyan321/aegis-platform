"use client";

import React from "react";
import {
  GitFork,
  Clock,
  ArrowUpRight,
  HelpCircle,
  Activity,
} from "lucide-react";
import { TelemetryData } from "@/lib/api";

interface TelemetryCardsProps {
  data: TelemetryData | null;
  loading?: boolean;
  onSelectCategory?: (category: "ALL" | "ACTIVE" | "CRITICAL") => void;
  onViewChange?: (view: "incidents" | "repositories" | "scans") => void;
}

export function TelemetryCards({
  data,
  loading,
  onSelectCategory,
  onViewChange,
}: TelemetryCardsProps) {
  const activeLeaks = data?.active_leaks ?? 0;
  const criticalCount = data?.critical_count ?? 0;
  const highCount = data?.high_count ?? 0;
  const mediumCount = data?.medium_count ?? 0;
  const lowCount = data?.low_count ?? 0;
  const openIncidents = criticalCount + highCount + mediumCount + lowCount;
  const totalRepos = data?.total_repositories ?? 0;
  const totalScans = data?.total_scans ?? 0;
  const mttr = (data?.mean_time_to_remediate_hours ?? 0.0).toFixed(1);
  const resolvedCount = data?.resolved_incidents ?? 0;

  const isAtRisk = activeLeaks > 0;

  if (loading) {
    return (
      <div className="bg-surface border border-subtle rounded-2xl p-5 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:divide-subtle/80">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className={`flex flex-col justify-between space-y-3.5 ${
                idx > 1 ? "lg:pl-6" : ""
              } ${idx < 4 ? "lg:pr-6" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 rounded shimmer-block" />
                <div className="h-4 w-4 rounded shimmer-block" />
              </div>
              <div className="h-7 w-32 rounded shimmer-block" />
              <div className="h-3 w-40 rounded shimmer-block" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-subtle rounded-2xl p-5 shadow-card transition-all">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:divide-subtle/80">
        
        {/* Segment 1: Live Fleet Posture & Active Verification */}
        <div
          onClick={() => {
            if (isAtRisk) {
              onViewChange?.("incidents");
              onSelectCategory?.("ACTIVE");
            }
          }}
          className={`flex flex-col justify-between space-y-3 lg:pr-6 ${
            isAtRisk ? "cursor-pointer group" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2.5 w-2.5">
                {isAtRisk ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                  </>
                ) : (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </>
                )}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-heading">
                Fleet Posture
              </span>
            </div>
            
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                isAtRisk
                  ? "bg-rose-50 border-rose-200 text-rose-700 font-bold"
                  : "bg-emerald-50/80 border-emerald-200 text-emerald-800"
              }`}
            >
              {isAtRisk ? "Action Required" : "Shield Active"}
            </span>
          </div>

          <div>
            <div className="flex items-baseline space-x-2">
              <span
                className={`text-2xl font-bold tracking-tight ${
                  isAtRisk ? "text-rose-600 font-mono" : "text-heading"
                }`}
              >
                {isAtRisk ? `${activeLeaks} Active Leaks` : "Zero Live Leaks"}
              </span>
            </div>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              {isAtRisk
                ? "Live credential verification confirmed active keys"
                : "Active cloud verification confirmed 0 live tokens"}
            </p>
          </div>
        </div>

        {/* Segment 2: Connected Repositories & Coverage */}
        <div
          onClick={() => onViewChange?.("repositories")}
          className="flex flex-col justify-between space-y-3 lg:px-6 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted group-hover:text-heading transition-colors flex items-center space-x-1.5">
              <span>Codebase Coverage</span>
            </span>
            <GitFork className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl font-bold text-heading tracking-tight font-mono tabular-nums">
                  {totalRepos}
                </span>
                <span className="text-xs font-semibold text-muted">
                  Repositories
                </span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              {totalScans} continuous webhook & CLI scans executed
            </p>
          </div>
        </div>

        {/* Segment 3: Security Findings & Severity Triage */}
        <div
          onClick={() => {
            onViewChange?.("incidents");
            onSelectCategory?.("CRITICAL");
          }}
          className="flex flex-col justify-between space-y-3 lg:px-6 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted group-hover:text-heading transition-colors flex items-center space-x-1.5">
              <span>Security Findings</span>
            </span>
            <Activity className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl font-bold text-heading tracking-tight font-mono tabular-nums">
                  {openIncidents}
                </span>
                <span className="text-xs font-semibold text-muted">
                  Open
                </span>
              </div>
              <div className="flex items-center space-x-1.5 text-[10px]">
                {criticalCount > 0 && (
                  <span className="font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                    {criticalCount} Critical
                  </span>
                )}
                {highCount > 0 && (
                  <span className="font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    {highCount} High
                  </span>
                )}
                {criticalCount === 0 && highCount === 0 && (
                  <span className="font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Clean
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              {criticalCount > 0
                ? `${criticalCount} high-priority incident${criticalCount === 1 ? "" : "s"} isolated`
                : "All static code patterns within safety thresholds"}
            </p>
          </div>
        </div>

        {/* Segment 4: Remediation Velocity & Lifecycle */}
        <div
          title="Mean Time to Remediate: Average duration from secret discovery to verified resolution."
          className="flex flex-col justify-between space-y-3 lg:pl-6"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center space-x-1.5">
              <span>Remediation MTTR</span>
              <HelpCircle className="w-3.5 h-3.5 text-muted/60 hover:text-heading transition-colors" aria-hidden="true" />
            </span>
            <Clock className="w-4 h-4 text-muted" />
          </div>

          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-heading tracking-tight font-mono tabular-nums">
                {mttr}h
              </span>
              <span className="text-xs font-semibold text-muted">
                avg response
              </span>
            </div>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              {resolvedCount} secret{resolvedCount === 1 ? "" : "s"} safely resolved and swept
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
