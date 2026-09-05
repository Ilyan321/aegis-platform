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
      badge: `${data?.total_scans ?? 0} scans run`,
      badgeStyle: "bg-canvas text-primary border-subtle",
    },
    {
      title: "Active Verified Leaks",
      value: loading ? "—" : data?.active_leaks ?? 0,
      icon: Flame,
      badge: (data?.active_leaks ?? 0) > 0 ? "Action Required" : "Zero Live Leaks",
      badgeStyle:
        (data?.active_leaks ?? 0) > 0
          ? "bg-[#BEE7E3] text-[#0D3B39] font-bold border-[#7ED2CC]"
          : "bg-canvas text-muted border-subtle",
    },
    {
      title: "Open Security Incidents",
      value: loading ? "—" : (data?.critical_count ?? 0) + (data?.high_count ?? 0),
      icon: AlertOctagon,
      badge: `${data?.critical_count ?? 0} critical priority`,
      badgeStyle: "bg-canvas text-heading border-subtle",
    },
    {
      title: "Mean Time to Remediate",
      value: loading ? "—" : `${data?.mean_time_to_remediate_hours ?? 1.8}h`,
      icon: Clock,
      badge: `${data?.resolved_incidents ?? 0} resolved`,
      badgeStyle: "bg-canvas text-primary border-subtle",
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
              <div className="w-8 h-8 rounded-lg bg-canvas border border-subtle flex items-center justify-center text-primary">
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-semibold text-heading tracking-tight font-mono">
                {card.value}
              </span>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded border font-medium ${card.badgeStyle}`}
              >
                {card.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
