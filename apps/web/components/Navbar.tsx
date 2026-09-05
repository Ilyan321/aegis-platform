"use client";

import React from "react";
import { ShieldAlert, Search, RefreshCw } from "lucide-react";

interface NavbarProps {
  onOpenCommand: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function Navbar({ onOpenCommand, onRefresh, isRefreshing }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full bg-surface border-b border-subtle">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-canvas border border-subtle flex items-center justify-center text-primary">
            <ShieldAlert className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-heading text-lg tracking-tight">Aegis</span>
              <span className="text-xs px-2 py-0.5 rounded bg-canvas border border-subtle text-muted font-medium">
                Control Plane
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right Controls */}
        <div className="flex items-center space-x-3">
          {/* Cmd+K Search Trigger */}
          <button
            onClick={onOpenCommand}
            className="flex items-center space-x-3 bg-canvas hover:bg-subtle/40 border border-subtle rounded-lg px-3.5 py-1.5 text-xs text-muted transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-muted" />
            <span>Quick search...</span>
            <kbd className="bg-surface border border-subtle text-heading rounded px-1.5 py-0.5 text-[10px] font-mono">
              ⌘K
            </kbd>
          </button>

          {/* Refresh Action */}
          <button
            onClick={onRefresh}
            title="Refresh dashboard telemetry"
            className="w-8 h-8 rounded-lg bg-canvas hover:bg-subtle/50 border border-subtle flex items-center justify-center text-muted hover:text-heading transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
