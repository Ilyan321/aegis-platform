# Product Requirements Document (PRD)

**Document Title:** Aegis Platform (`aegis-platform`)  
**Document Version:** 1.0.0-PROD  
**Target Release:** v1.0.0 Stable (Control Plane, Ingestion Engine & Telemetry Mesh)  
**Author / Engineering Lead:** Core Platform Engineering Team  
**Architecture Classification:** Distributed Event-Driven Control Plane (FastAPI + Celery/Redis + PostgreSQL + Next.js App Router)  
**Status:** Approved for Implementation via Anti-Gravity CLI Agent  

---

## 1. Introduction

### 1.1 Executive Summary
aegis-platform is the centralized, cloud-native SaaS control plane and orchestration fabric for the Aegis security ecosystem. While aegis-cli acts as the edge-level sensor running on workstations and CI runners, aegis-platform serves as the brain: aggregating distributed scan telemetries, managing enterprise repository integrations via GitHub webhooks, orchestrating asynchronous deep scans across remote codebases, tracking credential lifecycle states, dispatching instant incident alerts to SecOps channels, and hosting an Apple/Linear-grade operational dashboard.

Built using an asynchronous Python (FastAPI) ingestion layer, PostgreSQL for multi-tenant relational integrity, Redis + Celery for decoupled asynchronous background job queues, and Next.js (React 19 / App Router) styled with Tailwind CSS + shadcn/ui, aegis-platform bridges raw static analysis with automated enterprise incident response.

### 1.2 System Mission & Core Tenets
1. **Sub-Second Webhook Ingestion:** Inbound GitHub/GitLab webhook payloads must be acknowledged with an immediate HTTP 202 Accepted in <50 ms. No long-running Git clones or scans may block the web tier.
2. **Zero-Trust Audit Trails:** Every finding, triage status change, manual ignore, and automated rotation trigger must be recorded in an append-only audit ledger with actor metadata and timestamp precision.
3. **Multi-Tenant Data Isolation:** Strict foreign-key isolation and organizational boundaries ensuring zero cross-tenant leak exposure across repositories, incidents, or API keys.
4. **Linear / Apple Craftsmanship Standard:** The operator experience must avoid cluttered, dated enterprise consoles. The web interface must deliver ultra-responsive keyboard navigation (Cmd+K), glassmorphism telemetry displays, instant optimistic UI updates, and zero visual friction.

### 1.3 Target Audience & Personas
* **The Chief Information Security Officer (CISO) / SecOps Lead:** Needs an executive-level overview of aggregate repository risk scores, mean time to remediate (MTTR), active vs. revoked leak distributions, and historical compliance audits (SOC 2, ISO 27001).
* **The Lead DevOps / Platform Engineer:** Connects organization-wide GitHub/GitLab accounts, configures webhook secret validations, sets up Slack/Discord webhook alerts, and monitors background scanning queue throughput.
* **The Software Engineer / Contributor:** Uses the dashboard to review assigned pull-request blocks, understand the exact regex/entropy signature triggered by their commit, and request false-positive dismissals.
* **The Senior Technical Hiring Manager:** Inspects the distributed system architecture: verifying clean separation of concerns, asynchronous queue topologies, idempotency handling, safe secret storage, and modern frontend design systems.

---

## 2. Context

### 2.1 The Platform's Role in the DevSecOps Lifecycle
Local CLI scanners are vital, but they suffer from the Enforcement Gap:
* Developers can bypass local pre-commit hooks using `git commit --no-verify`.
* Engineering leadership has zero visibility into how many secrets are being blocked locally or which repositories have historical leaks sitting in dead branches.
* Remediating a leaked production token requires cross-system coordination: alerting the developer on Slack, pinging cloud IAM to revoke the key, updating HashiCorp Vault, and rewriting Git history.

aegis-platform eliminates the enforcement gap by acting as an un-bypassable cloud supervisor, ingesting webhook events, scheduling asynchronous clones and scans via Celery workers, verifying key status, and reporting results to Slack and the web dashboard.

---

## 3. Problem Statement (In-Depth Technical Breakdown)

### 3.1 Problem 1: Webhook Ingestion Timeouts and DoS Vulnerability
* **The Root Cause:** When a developer pushes a release tag containing 20 commits across 500 files, GitHub's webhook delivery engine sends an event and demands an HTTP 2xx response within 10 seconds. If the backend tries to clone the repo, parse the diffs, and calculate entropy synchronously inside the HTTP request handler, the request times out. GitHub marks the webhook as failed and stops delivering events.
* **The Vector:** Attackers can flood the endpoint with fake, unauthenticated push payloads, exhausting backend connection pools and forcing the server to process compute-heavy git operations.

### 3.2 Problem 2: Phantom Leaks and Non-Idempotent Ingestion
* **The Root Cause:** GitHub webhooks are delivered with an at-least-once delivery guarantee. Network blips, retry logic, or parallel CI runners frequently deliver duplicate webhook events or duplicate scan reports for the exact same commit SHA.
* **The Failure Mode:** If the database blindly inserts new incident rows on every payload, the dashboard shows multiple duplicate incidents for a single leaked key. Metrics like Total Active Incidents become inaccurate, destroying operational trust.

### 3.3 Problem 3: Secondary Leakage of Compromised Credentials in Plaintext DBs
* **The Root Cause:** When an incident is logged, naive systems store the raw detected secret in a standard TEXT column in PostgreSQL (e.g., `findings.raw_secret = "AKIAIOSFODNN7EXAMPLE"`).
* **The Security Catastrophe:** The security tool itself becomes the single most lucrative target in the organization. A read-only SQL injection vulnerability or an unencrypted database backup immediately exposes every API key, private key, and database credential across the entire company.

### 3.4 Problem 4: Distributed State Drift & Blind Incident Lifecycle
* **The Root Cause:** A developer leaks an API key in commit A. The platform flags it as CRITICAL / ACTIVE. Two hours later, the developer rotates the key in AWS and removes it from the code in commit B.
* **The Failure Mode:** Standard dashboards leave commit A's incident marked as OPEN / ACTIVE indefinitely because the system has no concept of lifecycle resolution or automated regression sweeps. Security engineers waste hours chasing resolved ghosts.

### 3.5 Problem 5: Sluggish, Over-Cluttered Enterprise Dashboards
* **The Root Cause:** Traditional security tools (SonarQube, Nessus) present overwhelming, dense tables with nested accordions, slow full-page reloads, and clunky navigation.
* **The User Frustration:** Modern engineering teams reject tools that don't match the speed and design elegance of modern tools like Linear, Vercel, or Raycast. Finding the offending code line takes 10 clicks, and filtering requires complex SQL-like query builders.

---

## 4. Architectural Solutions & Technical Specifications

### 4.1 Solution to 3.1: Asynchronous Ingestion Gateway with HMAC Verification
1. **HMAC-SHA256 Payload Authentication Middleware:** Every incoming webhook request to `/api/v1/webhooks/github` is validated against the repository's configured webhook secret using constant-time byte comparisons (`hmac.compare_digest`), rejecting spoofed payloads before any JSON parsing occurs.
2. **Immediate Enqueue & HTTP 202 Handshake:** The validated payload is pushed onto an in-memory Redis queue via Celery.
3. **Execution Latency:** The HTTP request lifecycle completes in <35 ms, satisfying GitHub's webhook SLA by a margin of 99.6%.

### 4.2 Solution to 3.2: Idempotent Event Deduplication & Deterministic Fingerprinting
1. **Redis Atomic Lock & Delivery Key Check:** Before processing, the worker checks the `X-GitHub-Delivery` GUID against Redis with a 24-hour TTL using an atomic `SET NX`.
2. **Deterministic Incident Fingerprinting:** Every detected leak is assigned a unique, immutable fingerprint derived from a SHA-256 hash of: `SHA256(RepositoryID + RuleID + FilePath + BlindHashedSecret)`.
3. **PostgreSQL Upsert Logic:** The database schema enforces a `UNIQUE(fingerprint, repository_id)` constraint. If a commit re-introduces an already open finding, the database updates the `last_seen_at` timestamp rather than creating a duplicate row.

### 4.3 Solution to 3.3: Cryptographic Blind Indexing and Salted Vault Storage
The platform implements a Dual-Cipher Architecture:
1. **The Masked Display String:** Only the sanitized version (e.g., `sk_live_************3a9f`) is rendered to API responses, client dashboards, and webhook notifications.
2. **The Blind Index (`secret_hash`):** Calculated using HMAC-SHA256 with an environment-level pepper. This allows fast indexed database lookups (`WHERE secret_hash = :hash`) to check if a token was seen before without ever decrypting or storing plaintext.
3. **Envelope Encryption (`encrypted_secret_blob`):** If full secret storage is enabled for compliance recovery, the payload is encrypted using AES-256-GCM using a Data Encryption Key (DEK) derived from a tenant-specific master key.

### 4.4 Solution to 3.4: Automated Incident Lifecycle & Regression Reconciliation
1. **State Reconciliation Engine:** When a new commit pushes changes to an existing branch, the Celery worker compares the staged AST diff. If the file line no longer contains the signature matching the incident's blind index, the platform automatically marks the incident status as `RESOLVED (REMOVED_IN_COMMIT)`.
2. **Regression Detection:** If a previously marked `RESOLVED` secret appears in a new branch or commit, the engine reopens the ticket, flags it as `REGRESSION`, elevates the severity to `CRITICAL`, and dispatches an urgent Slack ping.

### 4.5 Solution to 3.5: Linear/Apple Design System Architecture
* **Color Palette & Physics:** Built on deep zinc backdrops (`#09090b`), border highlights (`border-white/10`), subtle blurs, and typography using Inter / SF Pro Display.
* **Command Bar (`Cmd+K`):** Global fuzzy search component allowing instant jumps between repositories, specific incident IDs, or active verification sweeps.
* **Zero-Latency Navigation:** Server Components (RSC) handle initial data loads; client mutations execute via React optimistic actions so toggles, status dismissals, and ignores feel instantaneous.

---

## 5. Technical Specifications & File Layout

### 5.1 System Architecture Topology
* **Frontend UI:** Next.js (App Router) 15.x
* **UI Component Primitives:** shadcn/ui + Radix + Tailwind CSS
* **API Gateway:** FastAPI 0.115+ (Python 3.12+, Pydantic v2)
* **Primary Datastore:** PostgreSQL 16.x (Async SQLAlchemy 2.0 + Alembic)
* **Message Broker:** Redis 7.x
* **Background Workers:** Celery 5.4+

### 5.2 Monorepo File & Package Structure
* `apps/web`: Next.js frontend (`app/(auth)`, `app/(dashboard)`, `components/ui`, `components/dashboard`, `lib/api.ts`)
* `apps/api`: FastAPI backend (`alembic`, `app/api/v1/endpoints`, `app/core`, `app/models`, `app/schemas`, `app/services`, `app/workers`)
* `deploy`: `docker-compose.yml`, `nginx.conf`, `init.sql`

### 5.3 Database Architecture (PostgreSQL Schema)
* `organizations`: `id` (UUID), `name`, `slug`, `created_at`
* `repositories`: `id` (UUID), `organization_id`, `github_repo_id`, `full_name`, `clone_url`, `default_branch`, `webhook_secret`, `is_active`, `created_at`
* `scan_runs`: `id` (UUID), `repository_id`, `commit_sha`, `branch`, `trigger_source`, `status`, `files_scanned`, `duration_ms`, `started_at`, `completed_at`, `created_at`
* `incidents`: `id` (UUID), `repository_id`, `scan_run_id`, `fingerprint`, `secret_hash`, `encrypted_secret_blob`, `rule_id`, `rule_name`, `severity`, `status`, `verification_status`, `file_path`, `line_number`, `masked_snippet`, `commit_sha`, `committer_handle`, `first_seen_at`, `last_seen_at`, `resolved_at` (UNIQUE constraint on `repository_id`, `fingerprint`)
* `incident_audits`: `id` (UUID), `incident_id`, `actor_id`, `action`, `previous_state`, `new_state`, `created_at`

---

## 6. Risks, Edge Cases & Mitigation Strategies
* **Malicious Large Repositories:** Celery workers perform shallow clones (`git clone --depth=1`) inside containers bounded to 500MB disk and 1GB memory.
* **Concurrent Webhook Floods:** Redis-backed token bucket rate limiter via FastAPI middleware with prioritized worker queues.
* **Plaintext Memory Dumps:** Ephemeral buffers unreferenced immediately; only masked snippets and blind hashes persist.
* **Outbound Notification Loops:** Deduplication dampening aggregates commit findings into a single Slack Block Kit card.

---

## 7. Future Scope (v2.0 Platform Integration)
* Automated Cloud Provider Key Revocation (AWS IAM / Stripe machine-to-machine rotation).
* Automated Remediation Pull Requests via Celery worker.
* SAML / Enterprise SSO (Okta, Azure AD, Google Workspace via OIDC).

---

## 8. Conclusion & Implementation Sequence
1. **Initialize Monorepo Environment:** root `package.json` and `deploy/docker-compose.yml`.
2. **Scaffold FastAPI Backend:** Alembic migrations, async SQLAlchemy 2.0 engine, PostgreSQL models.
3. **Build Webhook Layer:** `app/api/v1/endpoints/webhooks.py` with HMAC validation and Celery dispatch.
4. **Implement Celery Worker:** `app/workers/tasks.py` with shallow clone and scanner engine integration.
5. **Scaffold Next.js Dashboard:** design tokens, TanStack incident tables, telemetry cards, `Cmd+K` palette.
6. **End-to-End Test:** verify webhook delivery, async execution, deduplication, and live dashboard rendering.
7. 
