"use client";

import React from "react";
import {
  ShieldCheck,
  ShieldAlert,
  GitFork,
  Clock,
  ArrowRight,
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
  const openIncidents = criticalCount + highCount + (data?.medium_count ?? 0) + (data?.low_count ?? 0);
  const totalRepos = data?.total_repositories ?? 0;
  const totalScans = data?.total_scans ?? 0;
  const mttr = (data?.mean_time_to_remediate_hours ?? 0.0).toFixed(1);
  const resolvedCount = data?.resolved_incidents ?? 0;

  const isAtRisk = activeLeaks > 0;
  const hasCritical = criticalCount > 0;

  if (loading) {
    return (
      <div className="bg-surface border border-subtle rounded-2xl p-4 sm:p-5 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:divide-subtle/80">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className={`flex flex-col justify-between space-y-3 ${
                idx > 1 ? "lg:pl-6" : ""
              } ${idx < 4 ? "lg:pr-6" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-24 rounded shimmer-block" />
                <div className="h-4 w-4 rounded shimmer-block" />
              </div>
              <div className="h-7 w-28 rounded shimmer-block" />
              <div className="h-3 w-36 rounded shimmer-block" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-subtle rounded-2xl p-4 sm:p-5 shadow-card transition-all">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:divide-subtle/80">
        
        {/* Section 1: Security Posture Status */}
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
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted flex items-center space-x-1.5">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isAtRisk
                    ? "bg-rose-500 animate-pulse"
                    : hasCritical
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
              />
              <span>Fleet Posture</span>
            </span>
            {isAtRisk ? (
              <ShieldAlert className="w-4 h-4 text-rose-600 group-hover:translate-x-0.5 transition-transform" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-primary" />
            )}
          </div>

          <div>
            <div className="flex items-baseline space-x-2">
              <span
                className={`text-2xl font-semibold tracking-tight ${
                  isAtRisk
                    ? "text-rose-600 font-mono"
                    : hasCritical
                    ? "text-heading"
                    : "text-heading"
                }`}
              >
                {isAtRisk
                  ? `${activeLeaks} Active Leaks`
                  : hasCritical
                  ? "Guarded"
                  : "Protected"}
              </span>
            </div>
            <p className="text-xs text-muted mt-1 truncate">
              {isAtRisk
                ? "Immediate revocation needed"
                : "Zero verified live credentials"}
            </p>
          </div>
        </div>

        {/* Section 2: Repositories & Coverage */}
        <div
          onClick={() => onViewChange?.("repositories")}
          className="flex flex-col justify-between space-y-3 lg:px-6 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted group-hover:text-heading transition-colors flex items-center space-x-1.5">
              <span>Repositories</span>
            </span>
            <GitFork className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold text-heading tracking-tight font-mono tabular-nums">
                {totalRepos}{" "}
                <span className="text-xs font-normal text-muted font-sans">
                  Connected
                </span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-xs text-muted mt-1 truncate">
              {totalScans} automated scan{totalScans === 1 ? "" : "s"} run
            </p>
          </div>
        </div>

        {/* Section 3: Incident Severity Breakdown */}
        <div
          onClick={() => {
            onViewChange?.("incidents");
            onSelectCategory?.("CRITICAL");
          }}
          className="flex flex-col justify-between space-y-3 lg:px-6 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted group-hover:text-heading transition-colors flex items-center space-x-1.5">
              <span>Open Incidents</span>
            </span>
            <Activity className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold text-heading tracking-tight font-mono tabular-nums">
                {openIncidents}
              </span>
              <div className="flex items-center space-x-1.5 text-[11px]">
                {criticalCount > 0 && (
                  <span className="font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                    {criticalCount} crit
                  </span>
                )}
                {highCount > 0 && (
                  <span className="font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    {highCount} high
                  </span>
                )}
                {criticalCount === 0 && highCount === 0 && (
                  <span className="text-muted">Clean</span>
                )}
              </div>
            </div>
            <p className="text-xs text-muted mt-1 truncate">
              {criticalCount > 0
                ? `${criticalCount} require critical priority`
                : "No high-severity blockers"}
            </p>
          </div>
        </div>

        {/* Section 4: Remediation Velocity (MTTR) */}
        <div
          title="Mean Time to Remediate: Average duration from credential discovery to verified resolution."
          className="flex flex-col justify-between space-y-3 lg:pl-6"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted flex items-center space-x-1.5">
              <span>Remediation MTTR</span>
              <HelpCircle className="w-3 h-3 text-muted/60" aria-hidden="true" />
            </span>
            <Clock className="w-4 h-4 text-muted" />
          </div>

          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-semibold text-heading tracking-tight font-mono tabular-nums">
                {mttr}h
              </span>
              <span className="text-xs text-muted font-normal">avg time</span>
            </div>
            <p className="text-xs text-muted mt-1 truncate">
              {resolvedCount} incident{resolvedCount === 1 ? "" : "s"} resolved
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
