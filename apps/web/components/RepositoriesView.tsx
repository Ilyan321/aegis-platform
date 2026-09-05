"use client";

import React, { useState } from "react";
import { GitFork, GitBranch, Plus, Search, Copy, Shield } from "lucide-react";
import { Repository } from "@/lib/api";
import { useToast } from "@/context/ToastContext";

interface RepositoriesViewProps {
  repositories: Repository[];
  onOpenOnboardModal: () => void;
  loading?: boolean;
}

export function RepositoriesView({
  repositories,
  onOpenOnboardModal,
  loading = false,
}: RepositoriesViewProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const filtered = repositories.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.default_branch.toLowerCase().includes(search.toLowerCase())
  );

  const copyCloneUrl = (url: string, name: string) => {
    navigator.clipboard.writeText(url);
    toast({
      type: "success",
      title: "Clone URL copied",
      description: `${name} clone URL copied to clipboard.`,
      duration: 2000,
    });
  };

  return (
    <div className="space-y-4">
      {/* View Header & Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-surface border border-subtle rounded-lg text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-interactive transition-all"
            />
          </div>
          <span className="text-xs text-muted font-medium">
            {filtered.length} {filtered.length === 1 ? "repository" : "repositories"}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenOnboardModal}
          className="flex items-center space-x-2 bg-primary hover:bg-heading text-surface px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Connect Repo</span>
        </button>
      </div>

      {/* Repositories Grid or Empty State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface border border-subtle rounded-xl p-5 space-y-3">
              <div className="h-5 w-32 rounded shimmer-placeholder" />
              <div className="h-4 w-48 rounded shimmer-placeholder" />
              <div className="h-4 w-20 rounded shimmer-placeholder" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-subtle rounded-xl p-16 text-center shadow-subtle">
          <div className="w-12 h-12 rounded-xl bg-canvas border border-subtle flex items-center justify-center text-primary mx-auto mb-4">
            <GitFork className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-heading mb-1">
            {search ? "No matching repositories" : "No repositories connected yet"}
          </h3>
          <p className="text-xs text-muted max-w-sm mx-auto mb-6">
            {search
              ? "No connected repositories match your search criteria."
              : "Register your GitHub repositories to activate continuous push-level secret interception."}
          </p>
          {!search && (
            <button
              type="button"
              onClick={onOpenOnboardModal}
              className="inline-flex items-center space-x-2 bg-primary hover:bg-heading text-surface px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect First Repository</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((repo) => (
            <div
              key={repo.id}
              className="bg-surface border border-subtle hover:border-interactive rounded-xl p-5 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header: Name & Status */}
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-canvas border border-subtle flex items-center justify-center text-primary group-hover:text-heading transition-colors">
                      <GitFork className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-sm text-heading tracking-tight truncate max-w-[180px]">
                      {repo.full_name}
                    </span>
                  </div>
                  <span className="inline-flex items-center space-x-1 bg-canvas border border-subtle text-primary px-2 py-0.5 rounded text-[10px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span>Active</span>
                  </span>
                </div>

                {/* Branch & Created */}
                <div className="flex items-center space-x-3 text-xs text-muted mb-3 font-mono">
                  <div className="flex items-center space-x-1">
                    <GitBranch className="w-3 h-3 text-muted" />
                    <span>{repo.default_branch}</span>
                  </div>
                  <span>•</span>
                  <span className="text-[11px]">
                    Added {new Date(repo.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Clone URL Box */}
                <div className="bg-canvas border border-subtle rounded-lg p-2 flex items-center justify-between text-xs text-muted font-mono mb-4">
                  <span className="truncate max-w-[200px] text-[11px]">{repo.clone_url}</span>
                  <button
                    type="button"
                    onClick={() => copyCloneUrl(repo.clone_url, repo.full_name)}
                    className="w-6 h-6 rounded hover:bg-surface border border-transparent hover:border-subtle flex items-center justify-center text-muted hover:text-heading transition-colors"
                    title="Copy clone URL"
                    aria-label="Copy clone URL"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Footer Meta */}
              <div className="pt-3 border-t border-subtle flex items-center justify-between text-[11px] text-muted">
                <span className="font-mono text-[10px] truncate max-w-[120px]">
                  ID: {repo.id.slice(0, 8)}...
                </span>
                <span className="flex items-center space-x-1 text-primary font-medium">
                  <Shield className="w-3 h-3" />
                  <span>Mesh Protected</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
