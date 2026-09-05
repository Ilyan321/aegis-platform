"use client";

import React, { useEffect } from "react";
import { Command } from "cmdk";
import { Search, ShieldAlert, GitFork, AlertCircle, Plus, X } from "lucide-react";
import { Incident, Repository } from "@/lib/api";

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  incidents: Incident[];
  repositories: Repository[];
  onSelectIncident: (inc: Incident) => void;
  onOpenOnboard: () => void;
  onSetTab: (tab: string) => void;
}

export function CommandMenu({
  isOpen,
  onClose,
  incidents,
  repositories,
  onSelectIncident,
  onOpenOnboard,
  onSetTab,
}: CommandMenuProps) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName))) {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open via parent
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-heading/40 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-subtle rounded-xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-100 cursor-default"
      >
        <Command label="Aegis Global Command Palette" className="w-full">
          <div className="flex items-center px-4 border-b border-subtle bg-canvas">
            <Search className="w-4 h-4 text-muted mr-3 shrink-0" />
            <Command.Input
              autoFocus
              placeholder="Type a command, repository, or incident ID..."
              className="w-full py-3.5 text-xs bg-transparent text-heading placeholder:text-muted focus:outline-none"
            />
            <div className="flex items-center space-x-2 shrink-0 ml-2">
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-surface border border-subtle rounded text-muted">
                ESC
              </kbd>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-lg bg-surface hover:bg-subtle border border-subtle flex items-center justify-center text-muted hover:text-heading transition-colors"
                title="Close (Esc)"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 space-y-1 text-xs">
            <Command.Empty className="py-6 text-center text-muted">
              No matching commands or findings.
            </Command.Empty>

            {/* Quick Actions */}
            <Command.Group heading="Actions" className="text-[10px] uppercase font-semibold text-muted px-2 py-1">
              <Command.Item
                onSelect={() => {
                  onOpenOnboard();
                  onClose();
                }}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-heading hover:bg-canvas cursor-pointer aria-selected:bg-canvas"
              >
                <Plus className="w-4 h-4 text-primary" />
                <span>Connect New Repository...</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onSetTab("ACTIVE");
                  onClose();
                }}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-heading hover:bg-canvas cursor-pointer aria-selected:bg-canvas"
              >
                <AlertCircle className="w-4 h-4 text-primary" />
                <span>View Active Live Leaks</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  onSetTab("CRITICAL");
                  onClose();
                }}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-heading hover:bg-canvas cursor-pointer aria-selected:bg-canvas"
              >
                <ShieldAlert className="w-4 h-4 text-primary" />
                <span>Filter Critical Incidents</span>
              </Command.Item>
            </Command.Group>

            {/* Incidents */}
            {incidents.length > 0 && (
              <Command.Group heading="Incidents" className="text-[10px] uppercase font-semibold text-muted px-2 py-1 mt-2">
                {incidents.slice(0, 5).map((inc) => (
                  <Command.Item
                    key={inc.id}
                    onSelect={() => {
                      onSelectIncident(inc);
                      onClose();
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-heading hover:bg-canvas cursor-pointer aria-selected:bg-canvas"
                  >
                    <div className="flex items-center space-x-2.5">
                      <ShieldAlert className="w-4 h-4 text-primary" />
                      <span className="font-medium truncate max-w-xs">{inc.rule_name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-muted">{inc.file_path}:{inc.line_number}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Repositories */}
            {repositories.length > 0 && (
              <Command.Group heading="Repositories" className="text-[10px] uppercase font-semibold text-muted px-2 py-1 mt-2">
                {repositories.map((repo) => (
                  <Command.Item
                    key={repo.id}
                    onSelect={() => {
                      onSetTab("ALL");
                      onClose();
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-heading hover:bg-canvas cursor-pointer aria-selected:bg-canvas"
                  >
                    <div className="flex items-center space-x-2.5">
                      <GitFork className="w-4 h-4 text-primary" />
                      <span>{repo.full_name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-muted">{repo.default_branch}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
