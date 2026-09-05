"use client";

import React from "react";
import { GitFork, Flame, AlertOctagon, Clock } from "lucide-react";
import { TelemetryData } from "@/lib/api";

interface TelemetryCardsProps {
  data: TelemetryData | null;
  loading?: boolean;
}

export function TelemetryCards({ data, loading }: TelemetryCardsProps) {
  const cards = [
    {
      title: "Connected Repositories",
      value: loading ? "—" : data?.total_repositories ?? 0,
      icon: GitFork,
      subtitle: `${data?.total_scans ?? 0} scans run`,
    },
    {
      title: "Active Verified Leaks",
      value: loading ? "—" : data?.active_leaks ?? 0,
      icon: Flame,
      subtitle: (data?.active_leaks ?? 0) > 0 ? "Action Required" : "Zero Live Leaks",
      isAlert: (data?.active_leaks ?? 0) > 0,
    },
    {
      title: "Open Security Incidents",
      value: loading ? "—" : (data?.critical_count ?? 0) + (data?.high_count ?? 0),
      icon: AlertOctagon,
      subtitle: `${data?.critical_count ?? 0} critical priority`,
    },
    {
      title: "Mean Time to Remediate",
      value: loading ? "—" : `${data?.mean_time_to_remediate_hours ?? 1.8}h`,
      icon: Clock,
      subtitle: `${data?.resolved_incidents ?? 0} resolved`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-surface border border-subtle rounded-xl p-6 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold tracking-wider uppercase text-muted">
                {card.title}
              </span>
              <Icon className="w-4 h-4 text-primary" />
            </div>

            <div className="flex items-baseline justify-between mt-3">
              <span className="text-3xl font-semibold text-heading tracking-tight font-mono">
                {card.value}
              </span>
              <span
                className={`text-xs font-medium ${
                  card.isAlert ? "text-primary font-semibold" : "text-muted"
                }`}
              >
                {card.subtitle}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
