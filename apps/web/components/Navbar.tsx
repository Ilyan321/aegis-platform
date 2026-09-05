"use client";

import React from "react";
import { Search, RefreshCw } from "lucide-react";

interface NavbarProps {
  onOpenCommand: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function Navbar({ onOpenCommand, onRefresh, isRefreshing }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full bg-surface border-b border-subtle">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Brand: Pure Vector Shield Emblem & Clean Typographic Identity */}
        <div className="flex items-center space-x-2.5">
          <svg
            className="w-5 h-5 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="font-semibold text-heading text-base tracking-tight">
            Aegis
          </span>
        </div>

        {/* Right Controls: Sleek Small Input Search Area & Refresh */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onOpenCommand}
            className="flex items-center space-x-2 bg-canvas hover:bg-subtle/30 border border-subtle hover:border-interactive rounded-lg px-3 py-1.5 w-36 sm:w-48 text-xs text-muted transition-colors group cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-muted group-hover:text-heading transition-colors" />
            <span className="text-muted group-hover:text-heading transition-colors">Search...</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            title="Refresh telemetry"
            aria-label="Refresh telemetry"
            className="w-8 h-8 rounded-lg hover:bg-canvas text-muted hover:text-heading flex items-center justify-center transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
