"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Shield,
  GitFork,
  Zap,
  Lock,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Activity,
  RotateCcw,
  ExternalLink,
} from "lucide-react";

export function LandingView() {
  const [copied, setCopied] = useState(false);

  const copyInstallCommand = () => {
    navigator.clipboard.writeText("curl -fsSL aegis.ilyankhan.tech | sh");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-canvas text-heading font-sans selection:bg-subtle selection:text-heading">
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full bg-surface border-b border-subtle">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-heading flex items-center justify-center text-accent shadow-subtle">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-heading">
                Aegis
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-mono font-bold tracking-widest px-2 py-0.5 rounded bg-canvas text-primary border border-subtle">
                Platform
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-xs font-medium text-muted">
            <a href="#architecture" className="hover:text-heading transition-colors">
              Architecture
            </a>
            <a href="#pipeline" className="hover:text-heading transition-colors">
              How It Works
            </a>
            <a href="#comparison" className="hover:text-heading transition-colors">
              Comparison
            </a>
            <a href="#faq" className="hover:text-heading transition-colors">
              FAQ
            </a>
            <a
              href="https://github.com/ilyankhan/aegis-platform"
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
              className="text-xs font-semibold text-muted hover:text-heading px-3.5 py-2 rounded-xl transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold bg-primary hover:bg-heading text-surface px-4 py-2 rounded-xl shadow-subtle transition-colors"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ────────────────────────────────────────────── */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 px-6 border-b border-subtle">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-surface border border-subtle rounded-full px-3.5 py-1.5 shadow-subtle mb-8">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-heading">
              Aegis v1.0.0 Production Release
            </span>
            <span className="text-subtle">|</span>
            <span className="text-xs text-muted">Zero-Trust Credential Mesh</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-heading leading-[1.1] max-w-4xl mx-auto">
            Stop credential leaks in Git before they reach production.
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
            A high-throughput DevSecOps control plane. Intercepts webhook pushes in <span className="font-mono font-semibold text-heading">&lt;35ms</span>, inspects entropy with zero plaintext storage, and reconciles incident lifecycles automatically.
          </p>

          {/* Action CTAs & CLI Command */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 text-sm font-semibold bg-primary hover:bg-heading text-surface px-6 py-3.5 rounded-xl shadow-card transition-all"
            >
              <span>Deploy Webhook Mesh Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Quick Install Bar */}
            <div className="w-full sm:w-auto flex items-center justify-between bg-surface border border-subtle rounded-xl px-4 py-3 shadow-subtle space-x-3 font-mono text-xs text-heading">
              <span className="text-primary font-bold">$</span>
              <span className="truncate">curl -fsSL aegis.ilyankhan.tech | sh</span>
              <button
                type="button"
                onClick={copyInstallCommand}
                aria-label="Copy install script"
                className="text-muted hover:text-heading p-1 rounded transition-colors cursor-pointer"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-primary" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Key Metrics Strip */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { label: "Webhook Handshake", val: "< 35 ms", desc: "Immediate 202 Enqueue" },
              { label: "Plaintext Storage", val: "0 bytes", desc: "HMAC Blind-Indexed" },
              { label: "Detection Engine", val: "40+ Rules", desc: "Regex & Shannon Entropy" },
              { label: "Remediation", val: "Auto-Reconcile", desc: "AST State Diff Verification" },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-surface border border-subtle rounded-2xl p-4 text-left shadow-subtle"
              >
                <span className="block text-[11px] font-semibold text-muted uppercase tracking-wider">
                  {stat.label}
                </span>
                <span className="block text-2xl font-bold font-mono text-heading mt-1">
                  {stat.val}
                </span>
                <span className="block text-[11px] text-muted mt-0.5">{stat.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Realistic Product UI Showcase ─────────────────────────── */}
        <div className="mt-16 max-w-6xl mx-auto">
          <div className="bg-surface border border-subtle rounded-2xl shadow-elevated overflow-hidden">
            {/* Window Header */}
            <div className="bg-canvas border-b border-subtle px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-border" />
                <div className="w-3 h-3 rounded-full bg-border" />
                <div className="w-3 h-3 rounded-full bg-border" />
                <span className="ml-2 font-mono text-xs font-semibold text-muted">
                  aegis-control-plane // incident-forensics-ledger
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs">
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-surface border border-subtle text-primary font-mono text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span>Mesh Active: 12 Repositories</span>
                </span>
              </div>
            </div>

            {/* Dashboard Mock Content */}
            <div className="p-6 space-y-6">
              {/* Telemetry Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-canvas border border-subtle rounded-xl p-4">
                  <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                    Total Monitored Branches
                  </span>
                  <div className="text-2xl font-bold font-mono text-heading mt-1">
                    48
                  </div>
                  <span className="text-[11px] text-primary font-medium mt-0.5 block">
                    Zero Webhook Latency Spikes
                  </span>
                </div>
                <div className="bg-canvas border border-subtle rounded-xl p-4">
                  <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                    Blocked Leak Attempts
                  </span>
                  <div className="text-2xl font-bold font-mono text-heading mt-1">
                    14
                  </div>
                  <span className="text-[11px] text-primary font-medium mt-0.5 block">
                    100% Intercepted Pre-Merge
                  </span>
                </div>
                <div className="bg-canvas border border-subtle rounded-xl p-4">
                  <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                    Mean Time to Remediate (MTTR)
                  </span>
                  <div className="text-2xl font-bold font-mono text-heading mt-1">
                    4.2m
                  </div>
                  <span className="text-[11px] text-muted mt-0.5 block">
                    Auto-reconciled on commit rotation
                  </span>
                </div>
              </div>

              {/* Forensic Table Header */}
              <div className="border border-subtle rounded-xl overflow-hidden bg-surface">
                <div className="bg-canvas/60 px-4 py-2.5 border-b border-subtle flex items-center justify-between text-xs font-semibold text-muted">
                  <span>DETECTED SECRET SIGNATURE</span>
                  <span className="hidden md:inline">REPOSITORY & FILE PATH</span>
                  <span className="hidden sm:inline">SEVERITY</span>
                  <span>LIFECYCLE STATUS</span>
                </div>

                {/* Finding 1 */}
                <div className="px-4 py-3.5 border-b border-subtle flex items-center justify-between text-xs hover:bg-canvas/30 transition-colors">
                  <div className="flex items-center space-x-3">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <div>
                      <div className="font-mono font-bold text-heading">
                        AWS_SECRET_ACCESS_KEY
                      </div>
                      <div className="font-mono text-[11px] text-muted mt-0.5">
                        wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY (Masked)
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:block font-mono text-[11px] text-muted">
                    org/payment-gateway &bull; src/config/aws.ts:42
                  </div>
                  <div className="hidden sm:block">
                    <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-mono text-[10px] font-bold">
                      CRITICAL
                    </span>
                  </div>
                  <div>
                    <span className="px-2.5 py-1 rounded-full bg-canvas text-primary border border-subtle font-mono text-[11px] font-semibold">
                      VERIFIED ACTIVE
                    </span>
                  </div>
                </div>

                {/* Finding 2 */}
                <div className="px-4 py-3.5 border-b border-subtle flex items-center justify-between text-xs hover:bg-canvas/30 transition-colors">
                  <div className="flex items-center space-x-3">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <div>
                      <div className="font-mono font-bold text-heading">
                        STRIPE_RESTRICTED_KEY
                      </div>
                      <div className="font-mono text-[11px] text-muted mt-0.5">
                        rk_live_51Hz...902a (HMAC Blind-Indexed)
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:block font-mono text-[11px] text-muted">
                    org/checkout-service &bull; tests/fixtures.py:18
                  </div>
                  <div className="hidden sm:block">
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-mono text-[10px] font-bold">
                      HIGH
                    </span>
                  </div>
                  <div>
                    <span className="px-2.5 py-1 rounded-full bg-surface text-muted border border-subtle font-mono text-[11px] font-medium">
                      AUTO-RESOLVED
                    </span>
                  </div>
                </div>

                {/* Finding 3 */}
                <div className="px-4 py-3.5 flex items-center justify-between text-xs hover:bg-canvas/30 transition-colors">
                  <div className="flex items-center space-x-3">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <div>
                      <div className="font-mono font-bold text-heading">
                        GITHUB_PERSONAL_ACCESS_TOKEN
                      </div>
                      <div className="font-mono text-[11px] text-muted mt-0.5">
                        ghp_9841fK...xZb2 (Commit #a419f0b)
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:block font-mono text-[11px] text-muted">
                    org/infrastructure-terraform &bull; main.tf:89
                  </div>
                  <div className="hidden sm:block">
                    <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-mono text-[10px] font-bold">
                      CRITICAL
                    </span>
                  </div>
                  <div>
                    <span className="px-2.5 py-1 rounded-full bg-canvas text-primary border border-subtle font-mono text-[11px] font-semibold">
                      TRIAGE REQUIRED
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Architecture & Engineering Tenets ──────────────────────── */}
      <section id="architecture" className="py-20 md:py-28 px-6 bg-surface border-b border-subtle">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-primary">
              Core Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-heading mt-2">
              Engineered for zero-delay pipelines and zero plaintext exposure.
            </h2>
            <p className="text-sm sm:text-base text-muted mt-4 leading-relaxed">
              Standard security tools slow down CI/CD or expose plaintext tokens in database tables. Aegis solves both problems at the architectural layer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-canvas border border-subtle rounded-2xl p-7 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-surface border border-subtle flex items-center justify-center text-primary mb-5 shadow-subtle">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-heading tracking-tight">
                  Sub-35ms Ingestion Gateway
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-3">
                  GitHub webhooks are authenticated with HMAC-SHA256 and acknowledged with an immediate HTTP 202 in under 35ms. Heavy git clone and static analysis workloads run asynchronously on Celery worker pools.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-subtle">
                <span className="font-mono text-[11px] text-primary font-semibold">
                  FastAPI + Redis + Celery
                </span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-canvas border border-subtle rounded-2xl p-7 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-surface border border-subtle flex items-center justify-center text-primary mb-5 shadow-subtle">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-heading tracking-tight">
                  Cryptographic Blind Indexing
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-3">
                  Detected credentials are never stored in plaintext. Aegis computes an HMAC-SHA256 blind index with environment-level salt to perform fast lookups and deduplication without exposing raw tokens in database backups.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-subtle">
                <span className="font-mono text-[11px] text-primary font-semibold">
                  AES-256-GCM + Blind Hash
                </span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-canvas border border-subtle rounded-2xl p-7 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-surface border border-subtle flex items-center justify-center text-primary mb-5 shadow-subtle">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-heading tracking-tight">
                  Automated Lifecycle Reconciler
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-3">
                  When a developer removes a leaked key in a subsequent commit, Aegis automatically marks the incident as resolved. If the secret resurfaces on another branch, Aegis triggers an urgent regression escalation.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-subtle">
                <span className="font-mono text-[11px] text-primary font-semibold">
                  AST Diff State Machine
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works (Pipeline) ────────────────────────────────── */}
      <section id="pipeline" className="py-20 md:py-28 px-6 border-b border-subtle">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-primary">
              Deployment Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-heading mt-2">
              Three steps from setup to complete repository protection.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-surface border border-subtle rounded-2xl p-6 shadow-subtle flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs font-bold text-primary px-2.5 py-1 rounded bg-canvas border border-subtle">
                    STEP 01
                  </span>
                  <GitFork className="w-5 h-5 text-muted" />
                </div>
                <h3 className="text-sm font-bold text-heading">
                  Connect Git Repositories
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-2">
                  Authenticate via GitHub OAuth or register custom organization webhooks with automated HMAC secret rotation.
                </p>
              </div>
              <div className="mt-6 p-3 bg-canvas border border-subtle rounded-xl font-mono text-[11px] text-muted">
                POST /api/v1/repositories/onboard
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-surface border border-subtle rounded-2xl p-6 shadow-subtle flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs font-bold text-primary px-2.5 py-1 rounded bg-canvas border border-subtle">
                    STEP 02
                  </span>
                  <Activity className="w-5 h-5 text-muted" />
                </div>
                <h3 className="text-sm font-bold text-heading">
                  Real-time Push Interception
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-2">
                  Every commit push triggers shallow sandboxed analysis across 40+ credential types with deterministic fingerprinting.
                </p>
              </div>
              <div className="mt-6 p-3 bg-canvas border border-subtle rounded-xl font-mono text-[11px] text-muted">
                SHA256(RepoID + RuleID + BlindHash)
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-surface border border-subtle rounded-2xl p-6 shadow-subtle flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs font-bold text-primary px-2.5 py-1 rounded bg-canvas border border-subtle">
                    STEP 03
                  </span>
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-bold text-heading">
                  Triage & Forensic Audit
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-2">
                  Instant Slack alerts and Linear-speed triage console with append-only compliance logs for SOC 2 and ISO 27001.
                </p>
              </div>
              <div className="mt-6 p-3 bg-canvas border border-subtle rounded-xl font-mono text-[11px] text-muted">
                Audit Ledger &bull; 100% Traceable
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison Table ────────────────────────────────────────── */}
      <section id="comparison" className="py-20 md:py-28 px-6 bg-surface border-b border-subtle">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-primary">
              Engineering Comparison
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-heading mt-2">
              How Aegis compares to legacy approaches.
            </h2>
          </div>

          <div className="border border-subtle rounded-2xl overflow-hidden shadow-subtle">
            <div className="grid grid-cols-4 bg-canvas/80 px-6 py-4 border-b border-subtle text-xs font-bold text-heading uppercase tracking-wider">
              <div className="col-span-1">Feature / Metric</div>
              <div className="text-center text-primary">Aegis Platform</div>
              <div className="text-center text-muted">GitHub Secret Scan</div>
              <div className="text-center text-muted">Generic CLI SAST</div>
            </div>

            {[
              {
                metric: "Ingestion Latency",
                aegis: "< 35ms (Async 202)",
                gh: "Variable",
                cli: "Blocks CI (minutes)",
              },
              {
                metric: "Plaintext Secret Storage",
                aegis: "Zero (Blind Indexed)",
                gh: "Encrypted Blob",
                cli: "Plaintext Logs/Disk",
              },
              {
                metric: "Triage & Audit Trail",
                aegis: "Append-Only SOC 2 Ledger",
                gh: "Basic Alert List",
                cli: "None / Console Output",
              },
              {
                metric: "Automated Lifecycle",
                aegis: "Auto-Resolve & Regressions",
                gh: "Manual Close",
                cli: "Static State Only",
              },
              {
                metric: "Local & Cloud Parity",
                aegis: "CLI Sensor + Cloud Hub",
                gh: "Cloud Only",
                cli: "Local Only",
              },
            ].map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-4 px-6 py-4 border-b border-subtle last:border-0 text-xs items-center hover:bg-canvas/30 transition-colors"
              >
                <div className="col-span-1 font-semibold text-heading">
                  {row.metric}
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
      <section id="faq" className="py-20 md:py-28 px-6 border-b border-subtle">
        <div className="max-w-4xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-primary">
              Frequently Asked Questions
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-heading mt-2">
              Everything you need to know about Aegis.
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "What types of secrets does Aegis detect?",
                a: "Aegis detects AWS keys (AKIA*), GitHub Personal Access Tokens, Stripe live keys, private RSA/EC certificates, database connection strings, JWT signing keys, and high-entropy API tokens across 40+ detection signatures.",
              },
              {
                q: "Does Aegis store raw secrets in the database?",
                a: "No. Aegis operates on a zero-plaintext architecture. Secret signatures are transformed into an HMAC-SHA256 blind index using an isolated environment pepper. Dashboards and notification alerts render only masked snippets (e.g. sk_live_****3a9f).",
              },
              {
                q: "Can I run Aegis self-hosted in our private VPC?",
                a: "Yes. Aegis is open-source and provides pre-configured Docker Compose and Kubernetes deployment manifests. You can deploy both the API control plane and Celery scanning workers entirely within your private infrastructure.",
              },
              {
                q: "How does Aegis prevent webhook timeouts during large pushes?",
                a: "The FastAPI gateway performs constant-time HMAC signature validation and immediately queues the event onto Redis with an HTTP 202 response within 35ms, fully complying with GitHub's webhook delivery SLA.",
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="bg-surface border border-subtle rounded-2xl p-6 shadow-subtle"
              >
                <h3 className="text-sm font-bold text-heading mb-2">{faq.q}</h3>
                <p className="text-xs text-muted leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-surface">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-heading">
            Deploy automated secret interception today.
          </h2>
          <p className="mt-4 text-sm text-muted max-w-xl mx-auto leading-relaxed">
            Protect your organization from credential exposure with zero CI delays. Get started in less than two minutes.
          </p>
          <div className="mt-8 flex items-center justify-center space-x-3">
            <Link
              href="/signup"
              className="inline-flex items-center space-x-2 text-sm font-semibold bg-primary hover:bg-heading text-surface px-6 py-3.5 rounded-xl shadow-card transition-colors"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="w-full bg-canvas border-t border-subtle py-8 px-6 text-xs text-muted">
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
            <a
              href="https://github.com/ilyankhan/aegis-platform"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-heading transition-colors"
            >
              GitHub
            </a>
          </div>
          <p className="text-[11px] text-muted">
            Zero-Trust Credential Security Mesh. Open Source.
          </p>
        </div>
      </footer>
    </div>
  );
}
