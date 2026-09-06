"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Terminal,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowLeft,
  Download,
  Sparkles,
  Layers,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { fetchCliAuthToken, CliTokenResponse } from "@/lib/api";

type TargetOS = "macos" | "linux" | "windows" | "wsl";

export default function CliPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedOS, setSelectedOS] = useState<TargetOS>("macos");
  const [tokenData, setTokenData] = useState<CliTokenResponse | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setLoadingToken(true);
      setErrorMessage(null);
      fetchCliAuthToken()
        .then((data) => setTokenData(data))
        .catch((err) => {
          const msg = err instanceof Error ? err.message : "Failed to generate CLI access token";
          setErrorMessage(msg);
        })
        .finally(() => setLoadingToken(false));
    }
  }, [user]);

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

  const getInstallCommand = (os: TargetOS) => {
    switch (os) {
      case "windows":
        return "irm https://aegis.ilyankhan.tech/install.ps1 | iex";
      case "macos":
      case "linux":
      case "wsl":
      default:
        return "curl -fsSL https://aegis.ilyankhan.tech/install.sh | bash";
    }
  };

  const loginCmd = tokenData
    ? `aegis login --token ${tokenData.cli_token}`
    : "aegis login --token <YOUR_TOKEN>";

  return (
    <div className="min-h-screen bg-canvas text-heading flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full bg-surface border-b border-subtle">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="flex items-center space-x-1.5 text-xs text-muted hover:text-heading transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="h-4 w-px bg-subtle" />
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-primary" />
              <span className="font-semibold text-xs text-heading">Aegis CLI</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href="https://github.com/Ilyan321/aegis-platform/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted hover:text-heading transition-colors inline-flex items-center space-x-1"
            >
              <span>GitHub Releases</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 space-y-10">
        {/* Hero Section */}
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pure Go · Zero Dependencies · &lt;10ms Pre-Commit Guard</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-heading sm:text-4xl">
            Aegis CLI Documentation & Setup
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            Install the compiled Aegis binary to intercept secrets on developer workstations, block leaks before git commits complete, and stream security posture directly into your cloud control plane.
          </p>
        </div>

        {/* OS Platform Selector */}
        <div className="flex items-center space-x-1 bg-surface border border-subtle p-1 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setSelectedOS("macos")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedOS === "macos"
                ? "bg-canvas text-heading font-semibold shadow-subtle"
                : "text-muted hover:text-heading hover:bg-canvas/50"
            }`}
          >
            macOS (Apple Silicon & Intel)
          </button>
          <button
            type="button"
            onClick={() => setSelectedOS("linux")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedOS === "linux"
                ? "bg-canvas text-heading font-semibold shadow-subtle"
                : "text-muted hover:text-heading hover:bg-canvas/50"
            }`}
          >
            Linux (x86_64 / ARM64)
          </button>
          <button
            type="button"
            onClick={() => setSelectedOS("windows")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedOS === "windows"
                ? "bg-canvas text-heading font-semibold shadow-subtle"
                : "text-muted hover:text-heading hover:bg-canvas/50"
            }`}
          >
            Windows (PowerShell)
          </button>
          <button
            type="button"
            onClick={() => setSelectedOS("wsl")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedOS === "wsl"
                ? "bg-canvas text-heading font-semibold shadow-subtle"
                : "text-muted hover:text-heading hover:bg-canvas/50"
            }`}
          >
            WSL (Ubuntu / Debian)
          </button>
        </div>

        {/* 4-Step Setup Workflow */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Steps Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Download & Install */}
            <section className="p-6 bg-surface border border-subtle rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <h2 className="text-sm font-semibold text-heading">Download & Install Aegis CLI</h2>
                </div>
                <span className="text-[11px] font-mono text-muted uppercase tracking-wider">
                  {selectedOS === "windows" ? "PowerShell" : "Shell Script"}
                </span>
              </div>

              <p className="text-xs text-muted leading-relaxed">
                {selectedOS === "windows"
                  ? "Runs the PowerShell installer, creates %LOCALAPPDATA%\\Programs\\Aegis\\aegis.exe, and registers user PATH."
                  : "Auto-detects CPU architecture (ARM64 / x86_64), downloads the latest binary, and installs /usr/local/bin/aegis."}
              </p>

              <div className="relative bg-canvas border border-subtle rounded-xl p-3.5 font-mono text-xs text-heading flex items-center justify-between group">
                <span className="truncate flex-1 pr-3 text-primary font-semibold text-[11px] sm:text-xs">
                  {getInstallCommand(selectedOS)}
                </span>
                <button
                  type="button"
                  onClick={() => copyText(getInstallCommand(selectedOS), "Install command")}
                  className="p-1.5 rounded-lg bg-surface hover:bg-subtle border border-subtle text-muted hover:text-heading transition-colors shrink-0 cursor-pointer shadow-xs"
                  title="Copy install command"
                >
                  {copiedSection === "Install command" ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {selectedOS === "windows" && (
                <div className="pt-2 text-[11px] text-muted flex items-center space-x-2">
                  <span>Manual binary:</span>
                  <a
                    href="https://github.com/Ilyan321/aegis-platform/releases/latest/download/aegis-windows-amd64.exe"
                    className="text-primary hover:underline inline-flex items-center space-x-1 font-mono"
                  >
                    <span>aegis-windows-amd64.exe</span>
                    <Download className="w-3 h-3" />
                  </a>
                </div>
              )}
            </section>

            {/* Step 2: Sign In & Authenticate */}
            <section className="p-6 bg-surface border border-subtle rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <h2 className="text-sm font-semibold text-heading">Sign In to Your Aegis Workspace</h2>
                </div>
                <span className="text-[11px] text-muted">Valid for 30 days</span>
              </div>

              <p className="text-xs text-muted leading-relaxed">
                Connect your terminal directly to your cloud dashboard. Scans executed with <code className="bg-canvas px-1 py-0.2 rounded border border-subtle font-mono text-[11px]">--sync</code> will be securely cataloged in your workspace.
              </p>

              {errorMessage && (
                <div className="p-3 bg-critical/10 border border-critical/20 rounded-xl text-xs text-critical">
                  {errorMessage}
                </div>
              )}

              {loadingToken ? (
                <div className="p-4 bg-canvas border border-subtle rounded-xl flex items-center justify-center space-x-2 text-xs text-muted">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Generating personal CLI token...</span>
                </div>
              ) : (
                <div className="relative bg-canvas border border-subtle rounded-xl p-3.5 font-mono text-xs text-heading flex items-center justify-between group">
                  <span className="truncate flex-1 pr-3 text-[11px] sm:text-xs">
                    {loginCmd}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(loginCmd, "Login command")}
                    className="p-1.5 rounded-lg bg-surface hover:bg-subtle border border-subtle text-muted hover:text-heading transition-colors shrink-0 cursor-pointer shadow-xs"
                    title="Copy login command"
                  >
                    {copiedSection === "Login command" ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}

              {/* Raw Token Reveal */}
              <div className="pt-1 flex items-center justify-between text-[11px] text-muted">
                <span>Personal API Token:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs">
                    {showToken ? tokenData?.cli_token : "••••••••••••••••••••••••"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="text-primary hover:text-heading transition-colors cursor-pointer"
                  >
                    {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </section>

            {/* Step 3: Initialize Repository Pre-Commit Hook */}
            <section className="p-6 bg-surface border border-subtle rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <h2 className="text-sm font-semibold text-heading">Initialize Repository Guardrail (`aegis init`)</h2>
                </div>
                <span className="text-[11px] font-mono text-primary font-semibold">&lt;10ms latency</span>
              </div>

              <p className="text-xs text-muted leading-relaxed">
                Run inside any local Git repository. Installs the zero-trust pre-commit hook in <code className="bg-canvas px-1 py-0.2 rounded border border-subtle font-mono text-[11px]">.git/hooks/pre-commit</code>. Any attempt to commit AWS keys, GitHub tokens, or private keys will be instantly intercepted and blocked.
              </p>

              <div className="relative bg-canvas border border-subtle rounded-xl p-3.5 font-mono text-xs text-heading flex items-center justify-between group">
                <span className="truncate flex-1 pr-3 text-primary font-semibold text-xs">
                  aegis init
                </span>
                <button
                  type="button"
                  onClick={() => copyText("aegis init", "Init command")}
                  className="p-1.5 rounded-lg bg-surface hover:bg-subtle border border-subtle text-muted hover:text-heading transition-colors shrink-0 cursor-pointer shadow-xs"
                  title="Copy init command"
                >
                  {copiedSection === "Init command" ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </section>

            {/* Step 4: Run Scans */}
            <section className="p-6 bg-surface border border-subtle rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <h2 className="text-sm font-semibold text-heading">Scan Repository & Stream Telemetry</h2>
                </div>
                <span className="text-[11px] text-muted">Deep Multi-Threaded</span>
              </div>

              <p className="text-xs text-muted leading-relaxed">
                Inspect codebases recursively or audit uncommitted changes with live provider verification.
              </p>

              <div className="space-y-2">
                <div className="relative bg-canvas border border-subtle rounded-xl p-3 font-mono text-xs text-heading flex items-center justify-between group">
                  <span className="truncate flex-1 pr-3 text-[11px] sm:text-xs">
                    aegis scan --sync
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText("aegis scan --sync", "Scan command")}
                    className="p-1.5 rounded-lg bg-surface hover:bg-subtle border border-subtle text-muted hover:text-heading transition-colors shrink-0 cursor-pointer"
                  >
                    {copiedSection === "Scan command" ? (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="relative bg-canvas border border-subtle rounded-xl p-3 font-mono text-xs text-heading flex items-center justify-between group">
                  <span className="truncate flex-1 pr-3 text-[11px] sm:text-xs">
                    aegis scan --verify --history
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText("aegis scan --verify --history", "History scan command")}
                    className="p-1.5 rounded-lg bg-surface hover:bg-subtle border border-subtle text-muted hover:text-heading transition-colors shrink-0 cursor-pointer"
                  >
                    {copiedSection === "History scan command" ? (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Terminal Emulation & Privacy Guarantees */}
          <div className="space-y-6">
            {/* Terminal Window Emulator */}
            <div className="bg-surface border border-subtle rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center px-4 py-3 bg-canvas border-b border-subtle space-x-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-[11px] font-mono text-muted pl-2">terminal — aegis scan</span>
              </div>
              <div className="p-4 font-mono text-[11px] leading-relaxed space-y-2 bg-canvas/60 text-muted overflow-x-auto">
                <p className="text-heading">$ aegis scan</p>
                <p className="text-primary font-bold">[AEGIS] DETECTED 1 SECRET LEAK(S)</p>
                <p className="border-t border-subtle pt-1 text-rose-400 font-semibold">
                  #1 [CRITICAL] AEGIS-AWS-001: AWS Access Key
                </p>
                <p className="text-muted">
                  &nbsp;&nbsp;Location: src/config/aws.ts:14<br />
                  &nbsp;&nbsp;Detected: AKIA****************<br />
                  &nbsp;&nbsp;Entropy:&nbsp;&nbsp;3.84 (High Confidence)
                </p>
                <p className="border-t border-subtle pt-1 text-amber-300">
                  ==&gt; Pre-commit hook blocked git commit (Exit Code 1)
                </p>
                <p className="text-muted">Scanned 142 files (12,410 lines) in 18ms</p>
              </div>
            </div>

            {/* Privacy & Zero-Exfiltration Guarantee */}
            <div className="p-6 bg-surface border border-subtle rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-primary font-semibold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Zero Secret Exfiltration Guarantee</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Aegis operates on a strict zero-knowledge model. Plaintext credentials are never saved to disk, logged to terminals, or sent across the network. Only masked values (e.g. <code className="bg-canvas px-1 py-0.2 rounded border border-subtle font-mono text-[10px]">AKIA****</code>) and blind-index HMAC-SHA256 hashes are communicated to the cloud platform.
              </p>
            </div>

            {/* Command Cheat Sheet */}
            <div className="p-6 bg-surface border border-subtle rounded-2xl space-y-3 text-xs">
              <div className="flex items-center space-x-2 text-heading font-semibold">
                <Layers className="w-4 h-4 text-primary" />
                <span>CLI Command Quick Reference</span>
              </div>
              <div className="space-y-2 font-mono text-[11px]">
                <div className="flex justify-between border-b border-subtle pb-1">
                  <span className="text-primary">aegis init</span>
                  <span className="text-muted">Install git pre-commit hook</span>
                </div>
                <div className="flex justify-between border-b border-subtle pb-1">
                  <span className="text-primary">aegis login</span>
                  <span className="text-muted">Link workspace token</span>
                </div>
                <div className="flex justify-between border-b border-subtle pb-1">
                  <span className="text-primary">aegis scan</span>
                  <span className="text-muted">Scan working tree</span>
                </div>
                <div className="flex justify-between border-b border-subtle pb-1">
                  <span className="text-primary">aegis status</span>
                  <span className="text-muted">Inspect pre-commit status</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface border-t border-subtle py-4 px-6 text-center text-xs text-muted">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="font-mono text-[11px]">Aegis Platform v1.0.0</span>
          <span>Zero-Dependency DevSecOps Intercept Mesh</span>
        </div>
      </footer>
    </div>
  );
}
