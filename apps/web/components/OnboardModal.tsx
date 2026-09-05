"use client";

import React, { useState } from "react";
import { X, GitFork } from "lucide-react";
import { createRepository, Repository } from "@/lib/api";

interface OnboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRepositoryAdded: (repo: Repository) => void;
  defaultOrgId: string;
}

export function OnboardModal({
  isOpen,
  onClose,
  onRepositoryAdded,
  defaultOrgId,
}: OnboardModalProps) {
  const [fullName, setFullName] = useState("");
  const [cloneUrl, setCloneUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const repo = await createRepository({
        organization_id: defaultOrgId,
        full_name: fullName.trim(),
        clone_url: cloneUrl.trim(),
        default_branch: branch.trim() || "main",
        webhook_secret: secret.trim() || undefined,
      });
      onRepositoryAdded(repo);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to onboard repository");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-heading/40 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-subtle rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 cursor-default"
      >
        <div className="flex items-center justify-between p-6 border-b border-subtle bg-canvas">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-surface border border-subtle flex items-center justify-center text-primary">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-heading text-base">Connect Repository</h3>
              <p className="text-xs text-muted">Register a Git repository for continuous webhook scanning</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface hover:bg-subtle border border-subtle flex items-center justify-center text-muted hover:text-heading transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-accent/40 border border-interactive text-heading text-xs rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">
              Repository Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ilyan321/demo-repo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-canvas border border-subtle rounded-lg text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-interactive"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">
              Clone URL (HTTPS / SSH)
            </label>
            <input
              type="text"
              required
              placeholder="https://github.com/org/repo.git"
              value={cloneUrl}
              onChange={(e) => setCloneUrl(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-canvas border border-subtle rounded-lg text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-interactive font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">
                Default Branch
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-canvas border border-subtle rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-interactive font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">
                Webhook Secret (Optional)
              </label>
              <input
                type="password"
                placeholder="Auto-generated"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-canvas border border-subtle rounded-lg text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-interactive font-mono"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-muted hover:text-heading hover:bg-canvas rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold bg-primary hover:bg-heading text-surface rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Connecting..." : "Add to Monitoring Mesh"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
