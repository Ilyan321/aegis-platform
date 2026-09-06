"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Bell,
  Check,
  Loader2,
  Send,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import {
  fetchWorkspaceSettings,
  updateWorkspaceSettings,
  sendTestAlert,
  OrganizationSettings,
} from "@/lib/api";
import { useToast } from "@/context/ToastContext";

interface AlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated?: (settings: OrganizationSettings) => void;
}

export function AlertSettingsModal({
  isOpen,
  onClose,
  onSettingsUpdated,
}: AlertSettingsModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingSlack, setTestingSlack] = useState(false);
  const [testingDiscord, setTestingDiscord] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [slackUrl, setSlackUrl] = useState("");
  const [discordUrl, setDiscordUrl] = useState("");

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setLoading(true);
      fetchWorkspaceSettings()
        .then((settings) => {
          setSlackUrl(settings.slack_webhook_url || "");
          setDiscordUrl(settings.discord_webhook_url || "");
        })
        .catch((err) => {
          console.error("Failed to load alert settings:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen]);

  // Keyboard dismiss (Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    try {
      const updated = await updateWorkspaceSettings({
        slack_webhook_url: slackUrl.trim() || null,
        discord_webhook_url: discordUrl.trim() || null,
      });

      toast({
        type: "success",
        title: "Alert Settings Saved",
        description: "Workspace notification webhooks have been successfully updated.",
      });
      onSettingsUpdated?.(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save alert settings";
      setErrorMessage(msg);
      toast({
        type: "error",
        title: "Update Failed",
        description: msg,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestSlack = async () => {
    if (!slackUrl.trim()) {
      toast({
        type: "info",
        title: "Slack URL Required",
        description: "Please enter a Slack incoming webhook URL to send a test alert.",
      });
      return;
    }

    setTestingSlack(true);
    try {
      // First save current inputs
      await updateWorkspaceSettings({
        slack_webhook_url: slackUrl.trim(),
        discord_webhook_url: discordUrl.trim() || null,
      });

      const res = await sendTestAlert("slack");
      toast({
        type: "success",
        title: "Slack Notification Sent",
        description: res.message || "Test alert delivered to your Slack channel.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Slack webhook dispatch failed";
      toast({
        type: "error",
        title: "Test Alert Failed",
        description: msg,
      });
    } finally {
      setTestingSlack(false);
    }
  };

  const handleTestDiscord = async () => {
    if (!discordUrl.trim()) {
      toast({
        type: "info",
        title: "Discord URL Required",
        description: "Please enter a Discord webhook URL to send a test alert.",
      });
      return;
    }

    setTestingDiscord(true);
    try {
      // First save current inputs
      await updateWorkspaceSettings({
        slack_webhook_url: slackUrl.trim() || null,
        discord_webhook_url: discordUrl.trim(),
      });

      const res = await sendTestAlert("discord");
      toast({
        type: "success",
        title: "Discord Notification Sent",
        description: res.message || "Test alert delivered to your Discord channel.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Discord webhook dispatch failed";
      toast({
        type: "error",
        title: "Test Alert Failed",
        description: msg,
      });
    } finally {
      setTestingDiscord(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-heading/40 backdrop-blur-xs cursor-pointer animate-in fade-in duration-150"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-settings-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-subtle rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-modal flex flex-col cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-subtle bg-canvas shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-surface border border-subtle flex items-center justify-center text-primary shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 id="alert-settings-title" className="font-semibold text-heading text-base">Alert Integrations</h3>
              <p className="text-xs text-muted">
                Route real-time secret leaks and regressions to your team channels
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
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs rounded-xl p-3 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
              <p className="text-xs text-muted">Loading workspace integrations...</p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5">
              {/* Slack Webhook Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-heading flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-[#4A154B]" />
                    <span>Slack Incoming Webhook</span>
                  </label>
                  <a
                    href="https://api.slack.com/messaging/webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-primary hover:text-heading transition-colors flex items-center space-x-1"
                  >
                    <span>Slack Docs</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="url"
                    placeholder="https://hooks.slack.com/services/T.../B.../..."
                    value={slackUrl}
                    onChange={(e) => setSlackUrl(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-canvas border border-subtle rounded-lg text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-interactive font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleTestSlack}
                    disabled={testingSlack || !slackUrl.trim()}
                    className="px-3 py-2 text-xs font-semibold bg-surface hover:bg-subtle border border-subtle rounded-lg text-heading flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                    title="Send a test notification to Slack"
                  >
                    {testingSlack ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    ) : (
                      <Send className="w-3.5 h-3.5 text-primary" />
                    )}
                    <span>Test</span>
                  </button>
                </div>
                <p className="text-[11px] text-muted">
                  Aggregated Block Kit cards will be posted when critical secrets or regressions are detected.
                </p>
              </div>

              {/* Discord Webhook Section */}
              <div className="space-y-2 pt-2 border-t border-subtle">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-heading flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-[#5865F2]" />
                    <span>Discord Incoming Webhook</span>
                  </label>
                  <a
                    href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-primary hover:text-heading transition-colors flex items-center space-x-1"
                  >
                    <span>Discord Docs</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="url"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={discordUrl}
                    onChange={(e) => setDiscordUrl(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-canvas border border-subtle rounded-lg text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-interactive font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleTestDiscord}
                    disabled={testingDiscord || !discordUrl.trim()}
                    className="px-3 py-2 text-xs font-semibold bg-surface hover:bg-subtle border border-subtle rounded-lg text-heading flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                    title="Send a test notification to Discord"
                  >
                    {testingDiscord ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    ) : (
                      <Send className="w-3.5 h-3.5 text-primary" />
                    )}
                    <span>Test</span>
                  </button>
                </div>
                <p className="text-[11px] text-muted">
                  High-priority security alerts with live verification badges will be sent as rich embeds.
                </p>
              </div>

              {/* Notification Guarantees Callout */}
              <div className="bg-canvas border border-subtle rounded-xl p-3 text-xs space-y-1 text-muted">
                <div className="flex items-center space-x-1.5 text-primary font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Noise Reduction Guarantee</span>
                </div>
                <p className="text-[11px]">
                  Aegis consolidates commit findings into a single summary card to eliminate channel alert fatigue.
                </p>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-subtle bg-canvas flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-muted hover:text-heading hover:bg-surface rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2 text-xs font-semibold bg-primary hover:bg-heading text-surface rounded-lg transition-colors disabled:opacity-50 cursor-pointer flex items-center space-x-1.5 shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Save Alert Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
