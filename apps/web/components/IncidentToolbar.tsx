"use client";

import React from "react";
import { Plus, Search } from "lucide-react";

interface IncidentToolbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenOnboardModal: () => void;
  totalCount: number;
}

export function IncidentToolbar({
  currentTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  onOpenOnboardModal,
  totalCount,
}: IncidentToolbarProps) {
  const tabs = [
    { id: "ALL", label: "All Incidents" },
    { id: "CRITICAL", label: "Critical Priority" },
    { id: "ACTIVE", label: "Active Live Leaks" },
    { id: "RESOLVED", label: "Resolved" },
  ];

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
      {/* Segmented Filter Pills */}
      <div className="flex items-center space-x-1.5 p-1 bg-surface border border-subtle rounded-xl self-start">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-primary text-surface shadow-none"
                  : "text-muted hover:text-heading hover:bg-canvas"
              }`}
            >
              <span>{tab.label}</span>
              {tab.id === "ALL" && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                    isActive ? "bg-surface/20 text-surface" : "bg-canvas text-muted border border-subtle"
                  }`}
                >
                  {totalCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Actions */}
      <div className="flex items-center space-x-3">
        {/* Search Input */}
        <div className="relative flex-1 sm:w-72">
          <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter file, rule, or commit..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-surface border border-subtle rounded-lg text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-interactive transition-all"
          />
        </div>

        {/* Connect Repository Button */}
        <button
          onClick={onOpenOnboardModal}
          className="flex items-center space-x-2 bg-primary hover:bg-heading text-surface px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Connect Repo</span>
        </button>
      </div>
    </div>
  );
}
