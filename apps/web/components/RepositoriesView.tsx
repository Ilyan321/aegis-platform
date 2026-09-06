"use client";

import React, { useState } from "react";
import { GitFork, GitBranch, Plus, Search, Copy, Shield, Trash2, Loader2, Play, Check, Radio } from "lucide-react";
import { Repository, deleteRepository, triggerRepositoryScan } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { WebhookSetupModal } from "@/components/WebhookSetupModal";

interface RepositoriesViewProps {
  repositories: Repository[];
  onOpenOnboardModal: () => void;
  onRepositoryDeleted?: (id: string) => void;
  onScanTriggered?: () => void;
  loading?: boolean;
}

export function RepositoriesView({
  repositories,
  onOpenOnboardModal,
  onRepositoryDeleted,
  onScanTriggered,
  loading = false,
}: RepositoriesViewProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [scanningIds, setScanningIds] = useState<Set<string>>(new Set());
  const [webhookModalRepo, setWebhookModalRepo] = useState<Repository | null>(null);

  const handleTriggerScan = async (repo: Repository) => {
    setScanningIds((prev) => new Set(prev).add(repo.id));
    try {
      await triggerRepositoryScan(repo.id);
      toast({
        type: "success",
        title: "Scan initiated",
        description: `Deep secret scan queued for ${repo.full_name}.`,
      });
      onScanTriggered?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to trigger scan";
      toast({
        type: "error",
        title: "Scan trigger failed",
        description: message,
      });
    } finally {
      setScanningIds((prev) => {
        const next = new Set(prev);
        next.delete(repo.id);
        return next;
      });
    }
  };

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

  const handleDelete = async (repo: Repository) => {
    setDeletingId(repo.id);
    try {
      await deleteRepository(repo.id);
      toast({
        type: "success",
        title: "Repository disconnected",
        description: `${repo.full_name} has been removed from active monitoring.`,
      });
      setConfirmDeleteId(null);
      onRepositoryDeleted?.(repo.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to disconnect repository";
      toast({
        type: "error",
        title: "Disconnection failed",
        description: message,
      });
    } finally {
      setDeletingId(null);
    }
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
                  <div className="flex items-center space-x-1.5">
                    {repo.webhook_installed ? (
                      <button
                        type="button"
                        onClick={() => setWebhookModalRepo(repo)}
                        className="inline-flex items-center space-x-1 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer"
                        title="Webhook active. Click to view configuration."
                      >
                        <Check className="w-3 h-3" />
                        <span>Webhook Active</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setWebhookModalRepo(repo)}
                        className="inline-flex items-center space-x-1 bg-canvas hover:bg-subtle/60 border border-subtle hover:border-interactive text-muted hover:text-heading px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer"
                        title="Webhook not verified. Click to configure or auto-install."
                      >
                        <Radio className="w-3 h-3 text-primary" />
                        <span>Setup Webhook</span>
                      </button>
                    )}
                    <span className="inline-flex items-center space-x-1 bg-canvas border border-subtle text-primary px-2 py-0.5 rounded text-[10px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span>Active</span>
                    </span>
                  </div>
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

              {/* Footer Meta & Actions */}
              {confirmDeleteId === repo.id ? (
                <div className="pt-3 border-t border-subtle flex items-center justify-between animate-in fade-in duration-150">
                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    Disconnect repo?
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={deletingId === repo.id}
                      className="px-2 py-1 rounded text-[11px] font-medium text-muted hover:text-heading hover:bg-canvas transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(repo)}
                      disabled={deletingId === repo.id}
                      className="px-2.5 py-1 rounded text-[11px] font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center space-x-1 shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {deletingId === repo.id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Removing...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3 h-3" />
                          <span>Confirm</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-subtle flex items-center justify-between text-[11px] text-muted">
                  <div className="flex items-center space-x-2">
                    <span className="flex items-center space-x-1 text-primary font-medium">
                      <Shield className="w-3 h-3" />
                      <span>Mesh Protected</span>
                    </span>
                    <span className="text-muted/40">•</span>
                    <span className="font-mono text-[10px] truncate max-w-[80px]">
                      {repo.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleTriggerScan(repo)}
                      disabled={scanningIds.has(repo.id)}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-medium text-heading hover:bg-canvas border border-subtle hover:border-interactive transition-colors cursor-pointer disabled:opacity-50"
                      title={`Run scan on ${repo.full_name}`}
                      aria-label={`Run scan on ${repo.full_name}`}
                    >
                      {scanningIds.has(repo.id) ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-primary" />
                          <span>Scanning...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 text-primary fill-current" />
                          <span>Scan</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(repo.id)}
                      className="p-1 rounded-md text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title={`Disconnect ${repo.full_name}`}
                      aria-label={`Disconnect ${repo.full_name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Webhook Setup & Configuration Modal */}
      <WebhookSetupModal
        isOpen={!!webhookModalRepo}
        onClose={() => setWebhookModalRepo(null)}
        repository={webhookModalRepo}
        onWebhookInstalled={(repoId) => {
          const target = repositories.find((r) => r.id === repoId);
          if (target) target.webhook_installed = true;
          onScanTriggered?.();
        }}
      />
    </div>
  );
}
