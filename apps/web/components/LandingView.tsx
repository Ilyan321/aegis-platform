"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Shield,
  GitFork,
  Zap,
  Lock,
  Copy,
  Check,
  ArrowRight,
  ExternalLink,
  FileCode,
  GitCommit,
  RotateCcw,
  Server,
} from "lucide-react";

export function LandingView() {
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [activeCliTab, setActiveCliTab] = useState<"bash" | "powershell">("bash");

  const bashCommand = "curl -fsSL https://aegis.ilyankhan.tech/install.sh | bash";
  const psCommand = "irm https://aegis.ilyankhan.tech/install.ps1 | iex";

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(id);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  return (
    <div className="min-h-screen bg-canvas text-heading font-sans selection:bg-subtle selection:text-heading">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full bg-surface border-b border-subtle">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-heading flex items-center justify-center text-accent shadow-subtle">
              <Shield className="w-4 h-4 text-accent" />
            </div>
            <span className="font-bold text-base tracking-tight text-heading">
              Aegis
            </span>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-xs font-medium text-muted">
            <a href="#architecture" className="hover:text-heading transition-colors">
              Architecture
            </a>
            <a href="#enforcement" className="hover:text-heading transition-colors">
              Enforcement Gap
            </a>
            <a href="#cli" className="hover:text-heading transition-colors">
              CLI & Sensor
            </a>
            <a href="#comparison" className="hover:text-heading transition-colors">
              Comparison
            </a>
            <a href="#faq" className="hover:text-heading transition-colors">
              FAQ
            </a>
            <a
              href="https://github.com/Ilyan321/aegis-platform"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-heading transition-colors inline-flex items-center space-x-1"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </nav>

          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="text-xs font-semibold text-muted hover:text-heading px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold bg-primary hover:bg-heading text-surface px-3.5 py-2 rounded-lg shadow-subtle transition-colors"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Asymmetric Hero Section ─────────────────────────────────── */}
      <section className="py-16 md:py-24 px-6 border-b border-subtle">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Core Positioning */}
          <div className="lg:col-span-7 space-y-6">
            <div className="text-xs font-mono font-bold tracking-widest text-primary uppercase">
              DevSecOps Secret Interception & Orchestration
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-heading leading-[1.08]">
              Stop credential leaks in Git before they reach production.
            </h1>

            <p className="text-base sm:text-lg text-muted leading-relaxed max-w-2xl">
              A high-throughput control plane for engineering teams. Ingests GitHub push webhooks in under 35ms, scans diffs with Shannon entropy and 40+ credential signatures, and reconciles incident lifecycles automatically.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center space-x-2 text-sm font-semibold bg-primary hover:bg-heading text-surface px-5 py-3 rounded-lg shadow-subtle transition-colors text-center"
              >
                <span>Connect GitHub Organization</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://github.com/Ilyan321/aegis-platform"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center space-x-2 text-sm font-medium text-heading bg-surface hover:bg-canvas border border-subtle px-5 py-3 rounded-lg transition-colors text-center"
              >
                <span>View Source Code</span>
                <ExternalLink className="w-4 h-4 text-muted" />
              </a>
            </div>

            {/* CLI Quick Installer Bar */}
            <div className="pt-4 max-w-xl">
              <div className="bg-surface border border-subtle rounded-xl overflow-hidden shadow-subtle">
                <div className="flex items-center justify-between bg-canvas/80 px-3 py-2 border-b border-subtle">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setActiveCliTab("bash")}
                      className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded transition-colors ${
                        activeCliTab === "bash"
                          ? "bg-surface text-heading shadow-subtle"
                          : "text-muted hover:text-heading"
                      }`}
                    >
                      macOS / Linux
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCliTab("powershell")}
                      className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded transition-colors ${
                        activeCliTab === "powershell"
                          ? "bg-surface text-heading shadow-subtle"
                          : "text-muted hover:text-heading"
                      }`}
                    >
                      Windows PowerShell
                    </button>
                  </div>
                  <span className="text-[10px] font-mono text-muted">CLI v1.0.0</span>
                </div>

                <div className="p-3 flex items-center justify-between font-mono text-xs text-heading bg-surface">
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-primary font-bold select-none">$</span>
                    <span className="truncate select-all">
                      {activeCliTab === "bash" ? bashCommand : psCommand}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        activeCliTab === "bash" ? bashCommand : psCommand,
                        "hero-install"
                      )
                    }
                    className="ml-3 p-1.5 rounded text-muted hover:text-heading hover:bg-canvas transition-colors shrink-0 cursor-pointer"
                    aria-label="Copy installation command"
                  >
                    {copiedScript === "hero-install" ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Real Operational Terminal & Incident Preview */}
          <div className="lg:col-span-5 space-y-4">
            {/* Terminal Block */}
            <div className="bg-heading rounded-xl border border-heading overflow-hidden shadow-elevated">
              <div className="bg-[#000F24] px-4 py-2.5 flex items-center justify-between border-b border-heading/40">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="font-mono text-[11px] text-accent/70">
                  terminal — aegis scan
                </span>
                <div className="w-8" />
              </div>

              <div className="p-4 font-mono text-[11px] text-canvas space-y-2 leading-relaxed">
                <div className="text-muted/80">
                  <span className="text-accent">$</span> git push origin feature/auth-sync
                </div>
                <div className="text-accent/90">
                  [aegis] Ingesting commit 8f4b1e2 (3 files modified)...
                </div>
                <div className="text-amber-400 bg-amber-950/40 p-2 rounded border border-amber-800/40">
                  [!] DETECTED: AWS_SECRET_ACCESS_KEY
                  <br />
                  &nbsp;&nbsp;&nbsp;File: services/auth/providers.ts:42
                  <br />
                  &nbsp;&nbsp;&nbsp;Entropy: 4.82 bits (Threshold: 4.30)
                  <br />
                  &nbsp;&nbsp;&nbsp;Dual-Cipher Hash: 8c3f91...b72a
                </div>
                <div className="text-emerald-400">
                  [aegis] Webhook ACK: 28ms &bull; Forensic ticket #INC-1042 queued
                </div>
              </div>
            </div>

            {/* Companion Triage Card */}
            <div className="bg-surface border border-subtle rounded-xl p-4 shadow-subtle space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-red-600" />
                  <span className="font-mono font-bold text-heading">
                    INC-1042: AWS Secret Key
                  </span>
                </div>
                <span className="font-mono text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                  CRITICAL
                </span>
              </div>

              <div className="text-xs text-muted font-mono bg-canvas p-2.5 rounded-lg border border-subtle">
                wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY (Masked)
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px]">
                <span className="text-muted">Actor: dev-lead@org.internal</span>
                <div className="flex items-center space-x-2">
                  <span className="text-primary font-semibold">Triage:</span>
                  <span className="font-mono font-medium text-heading bg-canvas px-2 py-0.5 rounded border border-subtle">
                    RESOLVED_IN_COMMIT
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The Problem / Enforcement Gap ──────────────────────────── */}
      <section id="enforcement" className="py-20 px-6 bg-surface border-b border-subtle">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="space-y-3">
            <div className="text-xs font-mono font-bold tracking-widest text-primary uppercase">
              The Enforcement Gap
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-heading">
              Why local pre-commit hooks and static scanners fall short.
            </h2>
            <p className="text-sm sm:text-base text-muted max-w-3xl leading-relaxed">
              Developers frequently bypass client-side pre-commit hooks using <code className="font-mono font-semibold text-heading bg-canvas px-1.5 py-0.5 rounded">git commit --no-verify</code>. Without an un-bypassable cloud supervisor, leaked secrets sit in Git histories for months until attackers exploit them.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-canvas border border-subtle rounded-xl p-6 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-surface border border-subtle flex items-center justify-center text-heading font-mono text-xs font-bold">
                01
              </div>
              <h3 className="text-sm font-bold text-heading">
                Webhook Timeouts & DoS
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Large release pushes contain hundreds of file diffs. Synchronous scanners exceed GitHub&apos;s 10-second delivery window, dropping events and blinding security teams.
              </p>
            </div>

            <div className="bg-canvas border border-subtle rounded-xl p-6 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-surface border border-subtle flex items-center justify-center text-heading font-mono text-xs font-bold">
                02
              </div>
              <h3 className="text-sm font-bold text-heading">
                Secondary Plaintext Storage Leaks
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Naive security tools store detected credentials in plaintext database columns, turning the scanner into a high-value attack target during SQL injections or backup dumps.
              </p>
            </div>

            <div className="bg-canvas border border-subtle rounded-xl p-6 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-surface border border-subtle flex items-center justify-center text-heading font-mono text-xs font-bold">
                03
              </div>
              <h3 className="text-sm font-bold text-heading">
                Phantom Duplication & Alert Fatigue
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                At-least-once webhook retries and parallel CI runs create duplicate tickets for identical commit SHAs, flooding SecOps channels with ghost findings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Architecture & Engineering Solutions ───────────────────── */}
      <section id="architecture" className="py-20 px-6 border-b border-subtle">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="space-y-3">
            <div className="text-xs font-mono font-bold tracking-widest text-primary uppercase">
              System Architecture
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-heading">
              Four architectural solutions built for scale and security.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feature 1 */}
            <div className="bg-surface border border-subtle rounded-xl p-6 space-y-3 shadow-subtle">
              <div className="flex items-center space-x-2 text-primary">
                <Zap className="w-4 h-4" />
                <h3 className="text-sm font-bold text-heading">
                  Sub-35ms Asynchronous Ingestion Gateway
                </h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Incoming payloads to <code className="font-mono bg-canvas px-1 py-0.5 rounded text-heading">/api/v1/webhooks/github</code> are validated using constant-time HMAC-SHA256 comparison and immediately enqueued onto Redis. The HTTP handshake completes in &lt;35ms, satisfying GitHub SLAs with zero dropped events.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-surface border border-subtle rounded-xl p-6 space-y-3 shadow-subtle">
              <div className="flex items-center space-x-2 text-primary">
                <Lock className="w-4 h-4" />
                <h3 className="text-sm font-bold text-heading">
                  Cryptographic Blind Indexing
                </h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Dual-Cipher Architecture: secret signatures are salted and blind-indexed via HMAC-SHA256 for instantaneous deduplication queries (<code className="font-mono bg-canvas px-1 py-0.5 rounded text-heading">WHERE secret_hash = :hash</code>). Raw tokens are never stored in plaintext.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-surface border border-subtle rounded-xl p-6 space-y-3 shadow-subtle">
              <div className="flex items-center space-x-2 text-primary">
                <RotateCcw className="w-4 h-4" />
                <h3 className="text-sm font-bold text-heading">
                  Automated Lifecycle & Regression Reconciliation
                </h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                When a subsequent commit eliminates the offending token line, the Celery worker automatically updates the ticket status to <code className="font-mono bg-canvas px-1 py-0.5 rounded text-heading">RESOLVED (REMOVED_IN_COMMIT)</code>. If the key resurfaces on another branch, it triggers an instant regression escalation.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-surface border border-subtle rounded-xl p-6 space-y-3 shadow-subtle">
              <div className="flex items-center space-x-2 text-primary">
                <GitFork className="w-4 h-4" />
                <h3 className="text-sm font-bold text-heading">
                  Deterministic Fingerprinting & Deduplication
                </h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Every detected finding receives a deterministic fingerprint computed from <code className="font-mono bg-canvas px-1 py-0.5 rounded text-heading">SHA256(RepoID + RuleID + FilePath + BlindHash)</code> with a PostgreSQL <code className="font-mono bg-canvas px-1 py-0.5 rounded text-heading">UNIQUE</code> constraint, eliminating ghost findings during webhook retries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CLI & Sensor Section ───────────────────────────────────── */}
      <section id="cli" className="py-20 px-6 bg-surface border-b border-subtle">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="space-y-3">
            <div className="text-xs font-mono font-bold tracking-widest text-primary uppercase">
              CLI & Local Sensor
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-heading">
              Pure Go standalone binary for developer workstations and CI runners.
            </h2>
            <p className="text-sm sm:text-base text-muted max-w-3xl leading-relaxed">
              The <code className="font-mono font-semibold text-heading bg-canvas px-1.5 py-0.5 rounded">aegis</code> CLI runs locally with zero runtime dependencies. Install pre-commit hooks or integrate scans directly into GitHub Actions, GitLab CI, and Docker builds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
            <div className="bg-canvas border border-subtle rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between text-muted">
                <span className="font-bold text-heading">Local Directory Scan</span>
                <FileCode className="w-4 h-4" />
              </div>
              <div className="text-heading font-semibold">
                $ aegis scan .
              </div>
              <p className="text-[11px] text-muted font-sans leading-relaxed">
                Inspects uncommitted diffs and full repo history against 40+ credential rule definitions.
              </p>
            </div>

            <div className="bg-canvas border border-subtle rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between text-muted">
                <span className="font-bold text-heading">Git Hook Auto-Install</span>
                <GitCommit className="w-4 h-4" />
              </div>
              <div className="text-heading font-semibold">
                $ aegis init
              </div>
              <p className="text-[11px] text-muted font-sans leading-relaxed">
                Sets up executable pre-commit intercept hooks in the active Git repository.
              </p>
            </div>

            <div className="bg-canvas border border-subtle rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between text-muted">
                <span className="font-bold text-heading">Cloud Synchronization</span>
                <Server className="w-4 h-4" />
              </div>
              <div className="text-heading font-semibold">
                $ aegis login --token &lt;KEY&gt;
              </div>
              <p className="text-[11px] text-muted font-sans leading-relaxed">
                Authenticates the CLI sensor with your central control plane organization.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Technical Comparison ───────────────────────────────────── */}
      <section id="comparison" className="py-20 px-6 border-b border-subtle">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="space-y-3">
            <div className="text-xs font-mono font-bold tracking-widest text-primary uppercase">
              Technical Comparison
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-heading">
              How Aegis compares to existing secret scanning solutions.
            </h2>
          </div>

          <div className="border border-subtle rounded-xl overflow-hidden bg-surface shadow-subtle">
            <div className="grid grid-cols-4 bg-canvas px-6 py-3.5 border-b border-subtle text-xs font-bold text-heading uppercase tracking-wider">
              <div className="col-span-1">Capability</div>
              <div className="text-center text-primary font-mono">Aegis Platform</div>
              <div className="text-center text-muted font-mono">GitHub Secret Scan</div>
              <div className="text-center text-muted font-mono">Generic CLI SAST</div>
            </div>

            {[
              {
                cap: "Webhook Ingestion SLA",
                aegis: "< 35ms (Async 202)",
                gh: "Variable",
                cli: "Blocks CI execution",
              },
              {
                cap: "Plaintext Storage Policy",
                aegis: "Zero (Blind Indexed)",
                gh: "Encrypted Blob",
                cli: "Plaintext in CI logs",
              },
              {
                cap: "Lifecycle Auto-Resolve",
                aegis: "Automatic AST Reconciler",
                gh: "Manual Dismissal",
                cli: "Static State Only",
              },
              {
                cap: "Deduplication Engine",
                aegis: "Deterministic Fingerprint",
                gh: "Basic SHA Match",
                cli: "None / Duplicate rows",
              },
              {
                cap: "Self-Hostable Monorepo",
                aegis: "Docker Compose / Render",
                gh: "Enterprise Cloud Only",
                cli: "Local binary only",
              },
            ].map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-4 px-6 py-4 border-b border-subtle last:border-0 text-xs items-center hover:bg-canvas/40 transition-colors"
              >
                <div className="col-span-1 font-semibold text-heading">
                  {row.cap}
                </div>
                <div className="text-center font-bold text-primary font-mono">
                  {row.aegis}
                </div>
                <div className="text-center text-muted font-mono">{row.gh}</div>
                <div className="text-center text-muted font-mono">{row.cli}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 px-6 bg-surface border-b border-subtle">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="space-y-3">
            <div className="text-xs font-mono font-bold tracking-widest text-primary uppercase">
              Frequently Asked Questions
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-heading">
              Technical specifics and deployment details.
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "What types of secrets does Aegis detect?",
                a: "Aegis detects AWS Access Keys (AKIA*), GitHub Personal Access Tokens (ghp_*), Stripe Live Keys (sk_live_*), Private RSA/EC keys, Database Connection Strings, Slack Webhooks, JWT signing keys, and high-entropy API tokens across 40+ detection signatures.",
              },
              {
                q: "Does Aegis store raw secrets in the database?",
                a: "No. Aegis enforces a strict zero-plaintext storage policy. Detected secret signatures are transformed into an HMAC-SHA256 blind index using an environment pepper. The web console and Slack notifications render only masked snippets (e.g. sk_live_****3a9f).",
              },
              {
                q: "Can I self-host Aegis on our private cloud or Kubernetes cluster?",
                a: "Yes. Aegis is 100% open-source and provides pre-configured Docker Compose, Render Blueprint (render.yaml), and standard PostgreSQL + Redis orchestration manifests.",
              },
              {
                q: "How does Aegis prevent webhook delivery timeouts during large Git pushes?",
                a: "The FastAPI ingestion gateway validates the incoming payload's HMAC-SHA256 signature and enqueues the job onto Redis with an immediate HTTP 202 response within 35ms, comfortably satisfying GitHub's 10-second delivery SLA.",
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="bg-canvas border border-subtle rounded-xl p-6 space-y-2"
              >
                <h3 className="text-sm font-bold text-heading">{faq.q}</h3>
                <p className="text-xs text-muted leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom Call to Action ───────────────────────────────────── */}
      <section className="py-20 px-6 bg-canvas text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-heading">
            Deploy automated secret interception today.
          </h2>
          <p className="text-sm text-muted leading-relaxed max-w-xl mx-auto">
            Connect your GitHub repositories in less than two minutes. Open-source, zero-trust, and engineered for high-throughput development pipelines.
          </p>
          <div className="pt-2 flex items-center justify-center space-x-3">
            <Link
              href="/signup"
              className="inline-flex items-center space-x-2 text-sm font-semibold bg-primary hover:bg-heading text-surface px-6 py-3.5 rounded-lg shadow-subtle transition-colors"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="w-full bg-surface border-t border-subtle py-8 px-6 text-xs text-muted">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="font-semibold text-heading">Aegis Platform</span>
            <span>&bull;</span>
            <span className="font-mono text-[11px]">v1.0.0</span>
          </div>
          <div className="flex items-center space-x-6 text-[11px]">
            <Link href="/login" className="hover:text-heading transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="hover:text-heading transition-colors">
              Sign Up
            </Link>
            <Link href="/cli" className="hover:text-heading transition-colors">
              CLI Documentation
            </Link>
            <a
              href="https://github.com/Ilyan321/aegis-platform"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-heading transition-colors"
            >
              GitHub
            </a>
          </div>
          <p className="text-[11px] text-muted">
            Zero-Trust Credential Security Mesh. Open Source MIT License.
          </p>
        </div>
      </footer>
    </div>
  );
}
