"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Copy,
  Check,
  Loader2,
  Lock,
  GitFork,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Repository,
  fetchWebhookConfig,
  installRepositoryWebhook,
  WebhookConfig,
} from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

interface WebhookSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  repository: Repository | null;
  onWebhookInstalled?: (repoId: string) => void;
}

export function WebhookSetupModal({
  isOpen,
  onClose,
  repository,
  onWebhookInstalled,
}: WebhookSetupModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [config, setConfig] = useState<WebhookConfig | null>(null);
  const [activeTab, setActiveTab] = useState<"github" | "gitlab" | "bitbucket">("github");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && repository) {
      setError(null);
      setLoading(true);
      fetchWebhookConfig(repository.id)
        .then((cfg) => setConfig(cfg))
        .catch((err) => {
          const msg = err instanceof Error ? err.message : "Failed to load webhook configuration";
          setError(msg);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, repository]);

  if (!isOpen || !repository) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      type: "success",
      title: "Copied to clipboard",
      description: `${label} copied.`,
      duration: 2000,
    });
  };

  const handleAutoInstall = async () => {
    setInstalling(true);
    setError(null);
    try {
      const res = await installRepositoryWebhook(repository.id);
      toast({
        type: "success",
        title: "Webhook Installed",
        description: res.message || "GitHub webhook successfully created.",
      });
      if (config) {
        setConfig({ ...config, webhook_installed: true });
      }
      onWebhookInstalled?.(repository.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Auto-installation failed";
      setError(msg);
      toast({
        type: "error",
        title: "Installation Failed",
        description: msg,
      });
    } finally {
      setInstalling(false);
    }
  };

  const hasGithubOAuth = user?.has_github_token || user?.provider === "github";
  const isGithubRepo = repository.clone_url.includes("github.com");

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-heading/50 cursor-pointer animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-subtle rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-subtle bg-canvas shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-surface border border-subtle flex items-center justify-center text-primary shadow-xs">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-heading text-base">{repository.full_name}</h3>
                {config?.webhook_installed ? (
                  <span className="inline-flex items-center space-x-1 text-[10px] font-semibold bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" />
                    <span>Active</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[10px] font-semibold bg-canvas border border-subtle text-muted px-2 py-0.5 rounded-full">
                    Setup Required
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">
                Push & Pull Request Webhook Configuration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface hover:bg-subtle border border-subtle flex items-center justify-center text-muted hover:text-heading transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs rounded-xl p-3 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
              <p className="text-xs text-muted">Loading webhook settings...</p>
            </div>
          ) : (
            <>
              {/* 1-Click Auto Install (For GitHub OAuth users) */}
              {isGithubRepo && (
                <div className="bg-canvas border border-subtle rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-semibold text-heading flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <span>One-Click GitHub Webhook Setup</span>
                    </h4>
                    <p className="text-[11px] text-muted">
                      {hasGithubOAuth
                        ? "Automatically install the Aegis webhook on this repository via GitHub API."
                        : "Link your GitHub account to enable automated webhook installation."}
                    </p>
                  </div>

                  {hasGithubOAuth ? (
                    <button
                      type="button"
                      onClick={handleAutoInstall}
                      disabled={installing || config?.webhook_installed}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-primary hover:bg-heading text-surface rounded-lg transition-colors flex items-center space-x-1.5 shrink-0 cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      {installing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Installing...</span>
                        </>
                      ) : config?.webhook_installed ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Installed</span>
                        </>
                      ) : (
                        <>
                          <GitFork className="w-3.5 h-3.5" />
                          <span>Auto-Install Webhook</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <a
                      href="/api/v1/auth/github?mode=login"
                      className="px-3.5 py-1.5 text-xs font-semibold bg-surface hover:bg-subtle border border-subtle text-heading rounded-lg transition-colors flex items-center space-x-1.5 shrink-0"
                    >
                      <Lock className="w-3.5 h-3.5 text-muted" />
                      <span>Connect GitHub OAuth</span>
                    </a>
                  )}
                </div>
              )}

              {/* Webhook Configuration Parameters */}
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Webhook Payload Parameters
                </h4>

                {/* Payload URL */}
                <div className="space-y-1">
                  <span className="text-[11px] text-muted font-medium">Payload URL</span>
                  <div className="flex items-center space-x-2 bg-canvas border border-subtle rounded-lg p-2 font-mono text-xs text-heading">
                    <span className="truncate flex-1 text-[11px]">
                      {config?.webhook_url || "https://aegis-platform-wwgp.onrender.com/api/v1/webhooks/github"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          config?.webhook_url || "https://aegis-platform-wwgp.onrender.com/api/v1/webhooks/github",
                          "Payload URL"
                        )
                      }
                      className="p-1 rounded hover:bg-surface border border-transparent hover:border-subtle text-muted hover:text-heading transition-colors"
                      title="Copy URL"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Secret Key */}
                <div className="space-y-1">
                  <span className="text-[11px] text-muted font-medium">Secret (HMAC-SHA256)</span>
                  <div className="flex items-center space-x-2 bg-canvas border border-subtle rounded-lg p-2 font-mono text-xs text-heading">
                    <span className="truncate flex-1 text-[11px]">
                      {showSecret
                        ? config?.webhook_secret || "••••••••••••••••••••"
                        : "••••••••••••••••••••••••••••••••"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="p-1 rounded hover:bg-surface border border-transparent hover:border-subtle text-muted hover:text-heading transition-colors"
                      title={showSecret ? "Hide secret" : "Show secret"}
                    >
                      {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(config?.webhook_secret || "", "Webhook Secret")}
                      className="p-1 rounded hover:bg-surface border border-transparent hover:border-subtle text-muted hover:text-heading transition-colors"
                      title="Copy secret"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content Type & Events */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-canvas border border-subtle rounded-lg p-2.5">
                    <span className="text-[10px] text-muted block mb-0.5">Content type</span>
                    <span className="font-mono font-medium text-heading text-[11px]">
                      application/json
                    </span>
                  </div>
                  <div className="bg-canvas border border-subtle rounded-lg p-2.5">
                    <span className="text-[10px] text-muted block mb-0.5">Trigger Events</span>
                    <span className="font-mono font-medium text-heading text-[11px]">
                      push, pull_request
                    </span>
                  </div>
                </div>
              </div>

              {/* Provider-specific Setup Guides */}
              <div className="space-y-2 pt-2 border-t border-subtle">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("github")}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      activeTab === "github" ? "bg-primary text-surface" : "text-muted hover:text-heading"
                    }`}
                  >
                    GitHub Guide
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("gitlab")}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      activeTab === "gitlab" ? "bg-primary text-surface" : "text-muted hover:text-heading"
                    }`}
                  >
                    GitLab Guide
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("bitbucket")}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      activeTab === "bitbucket" ? "bg-primary text-surface" : "text-muted hover:text-heading"
                    }`}
                  >
                    Bitbucket Guide
                  </button>
                </div>

                <div className="bg-canvas border border-subtle rounded-xl p-3.5 text-xs space-y-2">
                  {activeTab === "github" && (
                    <ol className="list-decimal list-inside space-y-1 text-muted text-[11px]">
                      <li>Go to your GitHub repository: <strong className="text-heading">Settings</strong> → <strong className="text-heading">Webhooks</strong>.</li>
                      <li>Click <strong className="text-heading">Add webhook</strong>.</li>
                      <li>Paste the <strong className="text-heading">Payload URL</strong> and <strong className="text-heading">Secret</strong> above.</li>
                      <li>Set Content type to <code className="bg-surface px-1 py-0.2 rounded border border-subtle">application/json</code>.</li>
                      <li>Select <strong className="text-heading">&apos;Let me select individual events&apos;</strong> and check <strong className="text-heading">Pushes</strong> and <strong className="text-heading">Pull requests</strong>.</li>
                      <li>Click <strong className="text-heading">Add webhook</strong>.</li>
                    </ol>
                  )}

                  {activeTab === "gitlab" && (
                    <ol className="list-decimal list-inside space-y-1 text-muted text-[11px]">
                      <li>Go to your GitLab project: <strong className="text-heading">Settings</strong> → <strong className="text-heading">Webhooks</strong>.</li>
                      <li>Paste the <strong className="text-heading">Payload URL</strong> into the URL field.</li>
                      <li>Paste the <strong className="text-heading">Secret</strong> into Secret Token.</li>
                      <li>Select Trigger: <strong className="text-heading">Push events</strong> and <strong className="text-heading">Merge requests events</strong>.</li>
                      <li>Click <strong className="text-heading">Add webhook</strong>.</li>
                    </ol>
                  )}

                  {activeTab === "bitbucket" && (
                    <ol className="list-decimal list-inside space-y-1 text-muted text-[11px]">
                      <li>Go to your Bitbucket repository: <strong className="text-heading">Repository settings</strong> → <strong className="text-heading">Webhooks</strong>.</li>
                      <li>Click <strong className="text-heading">Add webhook</strong>.</li>
                      <li>Paste the URL and select Triggers: <strong className="text-heading">Repository push</strong> and <strong className="text-heading">Pull request created/updated</strong>.</li>
                      <li>Save the webhook.</li>
                    </ol>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-subtle bg-canvas flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-surface hover:bg-subtle border border-subtle rounded-lg text-heading transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
