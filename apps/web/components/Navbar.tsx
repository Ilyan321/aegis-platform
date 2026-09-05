"use client";

import React from "react";
import Link from "next/link";
import { Search, RefreshCw, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface NavbarProps {
  onOpenCommand: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function Navbar({ onOpenCommand, onRefresh, isRefreshing }: NavbarProps) {
  const { user, loading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full bg-surface border-b border-subtle">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Brand: Pure Vector Shield Emblem & Clean Typographic Identity */}
        <Link href="/" className="flex items-center space-x-2.5 group">
          <svg
            className="w-5 h-5 text-primary group-hover:text-heading transition-colors"
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
        </Link>

        {/* Right Controls: Sleek Small Input Search Area, Refresh & Auth */}
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
            className="w-8 h-8 rounded-lg hover:bg-canvas text-muted hover:text-heading flex items-center justify-center transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </button>

          <div className="h-4 w-px bg-subtle" />

          {/* Authentication Badge */}
          {loading ? (
            <div className="w-16 h-7 bg-canvas animate-pulse rounded-lg" />
          ) : user ? (
            <div className="flex items-center space-x-2.5">
              <div className="flex items-center space-x-2 bg-canvas border border-subtle rounded-lg px-2.5 py-1">
                <div className="w-5 h-5 rounded-full bg-subtle/70 text-heading font-semibold text-[10px] flex items-center justify-center">
                  {(user.full_name?.[0] || user.email[0] || "U").toUpperCase()}
                </div>
                <span className="text-xs font-medium text-heading hidden md:inline max-w-[120px] truncate">
                  {user.full_name || user.email.split("@")[0]}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                aria-label="Sign out"
                className="w-8 h-8 rounded-lg hover:bg-canvas text-muted hover:text-heading flex items-center justify-center transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
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

