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

  const installCmd = "curl -fsSL https://aegis.ilyankhan.tech/install.sh | bash";
  const loginCmd = tokenData
    ? `aegis login --token ${tokenData.cli_token}`
    : "aegis login";
  const scanCmd = "aegis scan --sync";
  const hookCmd = "aegis install-hook";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md cursor-pointer animate-in fade-in duration-150"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cli-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-subtle rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col cursor-default animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-subtle bg-canvas shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-surface border border-subtle flex items-center justify-center text-primary shadow-xs">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 id="cli-modal-title" className="font-semibold text-heading text-base">Aegis CLI</h3>
              <p className="text-xs text-muted">
                Zero-dependency pre-commit secret interceptor & local scanner
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

        {/* Modal Body: Step-by-Step Onboarding */}
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
            <div className="space-y-4">
              {/* Step 1: Download & Install */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-heading flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Download & Install Binary</span>
                  </span>
                  <span className="text-[10px] font-mono text-muted">macOS / Linux / WSL</span>
                </div>
                <div className="relative bg-canvas border border-subtle rounded-xl p-3 font-mono text-xs text-heading flex items-center justify-between group">
                  <span className="truncate flex-1 text-[11px] pr-2 text-primary font-semibold">
                    {installCmd}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(installCmd, "Install command")}
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
                <p className="text-[11px] text-muted pl-7">
                  Auto-detects OS architecture (ARM64 / x86_64) and installs <code className="bg-canvas px-1 py-0.2 rounded border border-subtle font-mono text-[10px]">/usr/local/bin/aegis</code>.
                </p>
              </div>

              {/* Step 2: Sign In & Authenticate */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-heading flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Sign In to Your Workspace</span>
                  </span>
                  <span className="text-[10px] text-muted">Pre-authenticated token</span>
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
                <p className="text-[11px] text-muted pl-7">
                  Links your local terminal securely to your Aegis cloud dashboard.
                </p>
              </div>

              {/* Step 3: Run Local Scan & Cloud Sync */}
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-semibold text-heading flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">3</span>
                  <span>Run Scan & Sync Findings</span>
                </span>
                <div className="relative bg-canvas border border-subtle rounded-xl p-3 font-mono text-xs text-heading flex items-center justify-between group">
                  <span className="truncate flex-1 text-[11px] pr-2 font-mono">
                    {scanCmd}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(scanCmd, "Scan command")}
                    className="p-1.5 rounded-lg bg-surface hover:bg-subtle border border-subtle text-muted hover:text-heading transition-colors shrink-0 cursor-pointer"
                    title="Copy command"
                  >
                    {copiedSection === "Scan command" ? (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-muted pl-7">
                  Runs local multi-threaded secret detection and records findings under <strong>Source: Local CLI</strong>.
                </p>
              </div>

              {/* Step 4: Install Pre-Commit Intercept Hook */}
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-semibold text-heading flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">4</span>
                  <span>Install Pre-Commit Intercept Hook</span>
                </span>
                <div className="relative bg-canvas border border-subtle rounded-xl p-3 font-mono text-xs text-heading flex items-center justify-between group">
                  <span className="truncate flex-1 text-[11px] pr-2 font-mono">
                    {hookCmd}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(hookCmd, "Hook command")}
                    className="p-1.5 rounded-lg bg-surface hover:bg-subtle border border-subtle text-muted hover:text-heading transition-colors shrink-0 cursor-pointer"
                    title="Copy command"
                  >
                    {copiedSection === "Hook command" ? (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-muted pl-7">
                  Installs git pre-commit hook in your local repo — rejects commits before secrets can ever be pushed to GitHub.
                </p>
              </div>

              {/* Raw Token Accordion */}
              <div className="space-y-1 pt-2 border-t border-subtle">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted font-medium">Personal API Token</span>
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="text-[10px] text-primary hover:text-heading transition-colors flex items-center space-x-1 cursor-pointer"
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
                    className="p-1 rounded hover:bg-surface text-muted hover:text-heading transition-colors cursor-pointer"
                    title="Copy token"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Zero Exfiltration Guarantee */}
              <div className="bg-canvas border border-subtle rounded-xl p-3 text-xs space-y-1 text-muted">
                <div className="flex items-center space-x-1.5 text-primary font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Zero Secret Exfiltration Guarantee</span>
                </div>
                <p className="text-[11px]">
                  Raw secret values never leave your machine. Only masked snippets and cryptographic HMAC-SHA256 blind indices are transmitted to the control plane.
                </p>
              </div>
            </div>
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
