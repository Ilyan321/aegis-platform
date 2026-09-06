"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Terminal,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { fetchCliAuthToken, CliTokenResponse } from "@/lib/api";
import { useToast } from "@/context/ToastContext";

interface CliAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CliAuthModal({ isOpen, onClose }: CliAuthModalProps) {
  const { toast } = useToast();
  const [tokenData, setTokenData] = useState<CliTokenResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setLoading(true);
      fetchCliAuthToken()
        .then((data) => setTokenData(data))
        .catch((err) => {
          const msg = err instanceof Error ? err.message : "Failed to load CLI authentication token";
          setError(msg);
        })
        .finally(() => setLoading(false));
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

  const copyText = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast({
      type: "success",
      title: "Copied to clipboard",
      description: `${section} copied to clipboard.`,
      duration: 2000,
    });
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const loginCmd = tokenData
    ? `aegis login --token ${tokenData.cli_token}`
    : "aegis login";

  const scanCmd = "aegis scan --sync";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-heading/40 backdrop-blur-xs cursor-pointer animate-in fade-in duration-150"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cli-auth-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-subtle rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-modal flex flex-col cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-subtle bg-canvas shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-surface border border-subtle flex items-center justify-center text-primary shadow-xs">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 id="cli-auth-title" className="font-semibold text-heading text-base">Aegis CLI Authentication</h3>
              <p className="text-xs text-muted">
                Connect your local terminal to sync scans and stream findings to your dashboard
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
              <p className="text-xs text-muted">Generating CLI access token...</p>
            </div>
          ) : (
            <>
              {/* Step 1: Install CLI */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-heading flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Install Aegis CLI</span>
                  </span>
                  <span className="text-[10px] text-muted">macOS / Linux / WSL</span>
                </div>
                <div className="relative bg-canvas border border-subtle rounded-xl p-3 font-mono text-xs text-heading flex items-center justify-between group">
                  <span className="truncate flex-1 text-[11px] pr-2">
                    curl -sSL https://aegis.ilyankhan.tech/install.sh | bash
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText("curl -sSL https://aegis.ilyankhan.tech/install.sh | bash", "Install command")}
                    className="p-1.5 rounded-lg bg-surface hover:bg-subtle border border-subtle text-muted hover:text-heading transition-colors shrink-0 cursor-pointer"
                    title="Copy command"
                  >
                    {copiedSection === "Install command" ? (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Step 2: Login Command */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-heading flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Authenticate CLI</span>
                  </span>
                  <span className="text-[10px] text-muted">Valid for 30 days</span>
                </div>
                <div className="relative bg-canvas border border-subtle rounded-xl p-3 font-mono text-xs text-heading flex items-center justify-between group">
                  <span className="truncate flex-1 text-[11px] pr-2">
                    {loginCmd}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(loginCmd, "Login command")}
                    className="p-1.5 rounded-lg bg-surface hover:bg-subtle border border-subtle text-muted hover:text-heading transition-colors shrink-0 cursor-pointer"
                    title="Copy command"
                  >
                    {copiedSection === "Login command" ? (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Step 3: Scan & Cloud Sync */}
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-semibold text-heading flex items-center space-x-1.5">
                  <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">3</span>
                  <span>Run Scan & Pre-Commit Hook</span>
                </span>
                <div className="relative bg-canvas border border-subtle rounded-xl p-3 font-mono text-xs text-heading flex items-center justify-between group">
                  <span className="truncate flex-1 text-[11px] pr-2">
                    {scanCmd}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(scanCmd, "Scan command")}
                    className="p-1.5 rounded-lg bg-surface hover:bg-subtle border border-subtle text-muted hover:text-heading transition-colors shrink-0"
                    title="Copy command"
                  >
                    {copiedSection === "Scan command" ? (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-muted">
                  Runs local zero-dependency secret detection and automatically records results in your Aegis dashboard under <strong>Source: Local CLI</strong>.
                </p>
              </div>

              {/* Raw Token (Optional / Advanced) */}
              <div className="space-y-1 pt-2 border-t border-subtle">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted font-medium">Raw Personal API Token</span>
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="text-[10px] text-primary hover:text-heading transition-colors flex items-center space-x-1"
                  >
                    {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showToken ? "Hide" : "Show"}</span>
                  </button>
                </div>
                <div className="flex items-center space-x-2 bg-canvas border border-subtle rounded-lg p-2 font-mono text-xs text-muted">
                  <span className="truncate flex-1 text-[11px]">
                    {showToken ? tokenData?.cli_token : "••••••••••••••••••••••••••••••••"}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(tokenData?.cli_token || "", "API token")}
                    className="p-1 rounded hover:bg-surface text-muted hover:text-heading transition-colors"
                    title="Copy token"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Privacy Guarantee */}
              <div className="bg-canvas border border-subtle rounded-xl p-3 text-xs space-y-1 text-muted">
                <div className="flex items-center space-x-1.5 text-primary font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Zero Secret Exfiltration Guarantee</span>
                </div>
                <p className="text-[11px]">
                  Raw secrets are never streamed over the network. Only masked values (e.g. <code className="bg-surface px-1 py-0.2 rounded border border-subtle">AKIA****</code>) and blind-index hashes are transmitted.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-subtle bg-canvas flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-primary hover:bg-heading text-surface rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
