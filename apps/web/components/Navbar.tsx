"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  LogOut,
  ChevronDown,
  Shield,
  GitFork,
  Activity,
  Bell,
  Terminal,
  User,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export type DashboardView = "incidents" | "repositories" | "scans";

interface NavbarProps {
  currentView?: DashboardView;
  onViewChange?: (view: DashboardView) => void;
  onOpenCommand: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  activeOrgName?: string;
  onOpenAlertSettings?: () => void;
  onOpenCliAuth?: () => void;
  onOpenAccountSettings?: () => void;
}

export function Navbar({
  currentView = "incidents",
  onViewChange,
  onOpenCommand,
  onRefresh,
  isRefreshing = false,
  activeOrgName,
  onOpenAlertSettings,
  onOpenCliAuth,
  onOpenAccountSettings,
}: NavbarProps) {
  const { user, loading, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close profile popover on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && profileOpen) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

  const initials = (user?.full_name?.[0] || user?.email[0] || "U").toUpperCase();
  const displayName = user?.full_name || user?.email.split("@")[0] || "Operator";

  return (
    <header className="sticky top-0 z-40 w-full bg-surface border-b border-subtle">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Left: Brand Identity & Workspace Badge */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <svg
              className="w-5 h-5 text-primary group-hover:text-heading transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="font-semibold text-heading text-base tracking-tight">
              Aegis
            </span>
          </Link>

          {/* Workspace Label */}
          {user && (
            <div className="hidden sm:flex items-center pl-3 border-l border-subtle">
              <span className="text-xs font-medium text-heading max-w-[160px] truncate" title={activeOrgName || "Workspace"}>
                {activeOrgName || "Workspace"}
              </span>
            </div>
          )}
        </div>

        {/* Center: Linear-Style Segmented View Switcher (Desktop) */}
        {onViewChange && (
          <nav aria-label="Control Plane Views" className="hidden md:flex items-center space-x-1 bg-canvas border border-subtle rounded-xl p-1">
            <button
              type="button"
              onClick={() => onViewChange("incidents")}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                currentView === "incidents"
                  ? "bg-surface text-heading font-semibold shadow-subtle"
                  : "text-muted hover:text-heading hover:bg-surface/50"
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>Incidents</span>
            </button>
            <button
              type="button"
              onClick={() => onViewChange("repositories")}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                currentView === "repositories"
                  ? "bg-surface text-heading font-semibold shadow-subtle"
                  : "text-muted hover:text-heading hover:bg-surface/50"
              }`}
            >
              <GitFork className="w-3.5 h-3.5 text-primary" />
              <span>Repositories</span>
            </button>
            <button
              type="button"
              onClick={() => onViewChange("scans")}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                currentView === "scans"
                  ? "bg-surface text-heading font-semibold shadow-subtle"
                  : "text-muted hover:text-heading hover:bg-surface/50"
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-primary" />
              <span>Scan Activity</span>
            </button>
          </nav>
        )}

        {/* Right Controls: Command Menu, Refresh, and User Popover */}
        <div className="flex items-center space-x-2.5">
          {/* Quick Search Button */}
          <button
            type="button"
            onClick={onOpenCommand}
            className="flex items-center space-x-2 bg-canvas hover:bg-subtle/30 border border-subtle hover:border-interactive rounded-lg px-3 py-1.5 w-36 sm:w-48 text-xs text-muted transition-colors group cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-muted group-hover:text-heading transition-colors" />
            <span className="text-muted group-hover:text-heading transition-colors">Search...</span>
          </button>

          {/* Refresh Telemetry */}
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh control plane telemetry"
            aria-label="Refresh telemetry"
            className="w-8 h-8 rounded-lg hover:bg-canvas text-muted hover:text-heading flex items-center justify-center transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </button>

          <div className="h-4 w-px bg-subtle" />

          {/* User Profile Popover / Sign In */}
          {loading ? (
            <div className="w-20 h-7 bg-canvas animate-pulse rounded-lg" />
          ) : user ? (
            <div className="relative" ref={popoverRef}>
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center space-x-2 bg-canvas hover:bg-subtle/40 border border-subtle rounded-lg px-2.5 py-1 transition-all cursor-pointer"
                aria-expanded={profileOpen}
                aria-haspopup="true"
              >
                <div className="w-5 h-5 rounded-full bg-subtle text-heading font-semibold text-[10px] flex items-center justify-center">
                  {initials}
                </div>
                <span className="text-xs font-medium text-heading hidden md:inline max-w-[100px] truncate">
                  {displayName}
                </span>
                <ChevronDown className={`w-3 h-3 text-muted transition-transform ${profileOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Apple-Style Solid Popover */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-surface border border-subtle rounded-xl shadow-elevated p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
                  {/* User Profile Details */}
                  <div className="flex items-center space-x-3 pb-3 border-b border-subtle">
                    <div className="w-9 h-9 rounded-full bg-canvas border border-subtle text-primary font-semibold text-sm flex items-center justify-center shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-heading truncate">{displayName}</p>
                      <p className="text-[11px] text-muted truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Workspace Context */}
                  <div className="py-2.5 border-b border-subtle space-y-1 text-xs">
                    <div className="flex items-center justify-between text-muted">
                      <span className="text-[11px] uppercase tracking-wider font-semibold">Workspace</span>
                      <span className="text-[10px] font-mono bg-canvas border border-subtle px-1.5 py-0.2 rounded">
                        {user.provider.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-heading truncate">
                      {activeOrgName || "Personal Workspace"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 space-y-1">
                    {onOpenAccountSettings && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          onOpenAccountSettings();
                        }}
                        className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs text-muted hover:text-heading hover:bg-canvas transition-colors cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5 text-primary" />
                        <span>Account & Security</span>
                      </button>
                    )}

                    {onOpenAlertSettings && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          onOpenAlertSettings();
                        }}
                        className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs text-muted hover:text-heading hover:bg-canvas transition-colors cursor-pointer"
                      >
                        <Bell className="w-3.5 h-3.5 text-primary" />
                        <span>Alert Settings & Webhooks</span>
                      </button>
                    )}

                    {onOpenCliAuth && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          onOpenCliAuth();
                        }}
                        className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs text-muted hover:text-heading hover:bg-canvas transition-colors cursor-pointer"
                      >
                        <Terminal className="w-3.5 h-3.5 text-primary" />
                        <span>Aegis CLI</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        onOpenCommand();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-muted hover:text-heading hover:bg-canvas transition-colors cursor-pointer"
                    >
                      <span>Command Palette</span>
                      <kbd className="text-[10px] font-mono text-muted">⌘K</kbd>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs text-muted hover:text-heading hover:bg-canvas transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs font-medium text-primary hover:text-heading bg-canvas hover:bg-subtle/50 border border-subtle hover:border-interactive px-3 py-1.5 rounded-lg transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
