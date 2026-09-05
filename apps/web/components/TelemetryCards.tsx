"use client";

import React from "react";
import { GitFork, Flame, AlertOctagon, Clock } from "lucide-react";
import { TelemetryData } from "@/lib/api";

interface TelemetryCardsProps {
  data: TelemetryData | null;
  loading?: boolean;
  onSelectCategory?: (category: "ALL" | "ACTIVE" | "CRITICAL") => void;
}

export function TelemetryCards({ data, loading, onSelectCategory }: TelemetryCardsProps) {
  const cards = [
    {
      id: "REPOSITORIES",
      title: "Connected Repositories",
      value: data?.total_repositories ?? 0,
      icon: GitFork,
      subtitle: `${data?.total_scans ?? 0} scans run`,
      isClickable: false,
    },
    {
      id: "ACTIVE",
      title: "Active Verified Leaks",
      value: data?.active_leaks ?? 0,
      icon: Flame,
      subtitle: (data?.active_leaks ?? 0) > 0 ? "Action Required" : "Zero Live Leaks",
      isAlert: (data?.active_leaks ?? 0) > 0,
      isClickable: true,
      category: "ACTIVE" as const,
    },
    {
      id: "CRITICAL",
      title: "Open Security Incidents",
      value: (data?.critical_count ?? 0) + (data?.high_count ?? 0),
      icon: AlertOctagon,
      subtitle: `${data?.critical_count ?? 0} critical priority`,
      isClickable: true,
      category: "CRITICAL" as const,
    },
    {
      id: "MTTR",
      title: "Mean Time to Remediate",
      value: `${data?.mean_time_to_remediate_hours ?? 1.8}h`,
      icon: Clock,
      subtitle: `${data?.resolved_incidents ?? 0} resolved`,
      isClickable: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const clickable = Boolean(card.isClickable && onSelectCategory);

        return (
          <div
            key={card.id}
            onClick={() => {
              if (clickable && card.category && onSelectCategory) {
                onSelectCategory(card.category);
              }
            }}
            className={`bg-surface border border-subtle rounded-xl p-6 flex flex-col justify-between shadow-subtle ${
              clickable ? "cursor-pointer hover:border-interactive transition-all hover:shadow-card group" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold tracking-wider uppercase text-muted group-hover:text-heading transition-colors">
                {card.title}
              </span>
              <Icon className="w-4 h-4 text-primary" />
            </div>

            <div className="flex items-baseline justify-between mt-3">
              {loading ? (
                <div className="h-8 w-20 rounded-md shimmer-placeholder my-0.5" />
              ) : (
                <span className="text-3xl font-semibold text-heading tracking-tight font-mono tabular-nums">
                  {card.value}
                </span>
              )}

              {loading ? (
                <div className="h-4 w-24 rounded shimmer-placeholder" />
              ) : (
                <div className="flex items-center space-x-1.5">
                  {card.isAlert && (
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      card.isAlert ? "text-primary font-semibold" : "text-muted"
                    }`}
                  >
                    {card.subtitle}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
