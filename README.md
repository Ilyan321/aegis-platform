# Aegis Platform (`aegis-platform`)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Architecture: Cloud Native](https://img.shields.io/badge/Architecture-Event--Driven-emerald.svg)]()
[![Stack: FastAPI + Next.js 15](https://img.shields.io/badge/Stack-FastAPI%20%2B%20Next.js%2015-violet.svg)]()
[![Design: Apple / Linear Crafted](https://img.shields.io/badge/Design-Apple%20Craftsmanship-teal.svg)]()

The centralized, cloud-native control plane and orchestration fabric for the **Aegis** security ecosystem.

While `aegis-cli` acts as the edge-level sensor running on workstations and CI runners, `aegis-platform` serves as the central brain: aggregating distributed scan telemetries, managing enterprise repository integrations via GitHub webhooks, orchestrating asynchronous deep scans across remote codebases, tracking credential lifecycle states, dispatching instant incident alerts to Slack channels, and hosting an Apple/Linear-grade operational dashboard.

---

## 🏗️ Architecture & Monorepo Structure

```text
aegis-platform/
├── apps/
│   ├── api/                 # FastAPI 0.115+ Backend & Celery Worker (Python 3.12+)
│   │   ├── app/             # Application source (api, core, models, schemas, services, workers)
│   │   │   ├── api/v1/      # REST endpoints (incidents, repos, telemetry, webhooks, orgs)
│   │   │   ├── core/        # Config, Dual-Cipher crypto engine, Celery app, DB session
│   │   │   ├── models/      # SQLAlchemy 2.0 async ORM models
│   │   │   ├── schemas/     # Pydantic v2 schemas
│   │   │   ├── services/    # Slack notifications, Webhook HMAC-SHA256 auth
│   │   │   └── workers/     # Celery asynchronous scanner task (idempotency, clone, triage)
│   │   ├── bin/             # Bundled standalone pure Go aegis-cli binary (Linux ELF x86_64)
│   │   ├── Dockerfile       # Container definition for Render cloud web service
│   │   ├── requirements.txt # Python dependencies
│   │   └── start.sh         # Startup script (Alembic + Celery + Uvicorn)
│   └── web/                 # Next.js 15 (React 19, Tailwind CSS, Lucide, cmdk) Frontend
│       ├── app/             # App Router pages, layout, and custom teal design system
│       ├── components/      # Apple-crafted components (Navbar, TelemetryCards, IncidentTable,
│       │                    # IncidentToolbar, IncidentDetailModal, OnboardModal, CommandMenu)
│       └── lib/             # Typed API client and helpers
├── deploy/                  # Cloud & local deployment manifests
│   ├── docker-compose.yml   # Multi-service local dev composition
│   ├── init.sql             # PostgreSQL extensions initialization (uuid, pgcrypto)
│   ├── render.yaml          # Render blueprint for 1-click cloud backend deployment
│   └── vercel.json          # Vercel deployment specification for Next.js frontend
├── AEGIS_CLI_SPEC.md        # Technical data contract & JSON schema for aegis-cli
├── PRD.md                   # Product Requirements Document
├── render.yaml              # Root Render blueprint manifest
└── package.json             # Root npm workspace configuration
```

---

## 🎨 Apple-Crafted UI/UX Design System

The Aegis dashboard is built with disciplined Apple and Linear software design standards:
- **No glassmorphism, no artificial blur, and no multi-color gradient slop.**
- **Solid, crisp, high-contrast surfaces** with 1px hairline borders (`#BEE7E3`).
- **Generous 8pt spatial rhythm** to prevent clustered or cramped UI elements.
- **Precision 8-color palette**:
  | Token | Hex | Role |
  | :--- | :--- | :--- |
  | `canvas` | `#E6F4F3` | Page background canvas |
  | `subtle` | `#BEE7E3` | Hairline dividers and borders |
  | `accent` | `#7ED2CC` | Secondary indicator & pill highlights |
  | `interactive` | `#40B3A6` | Focus rings, active states, borders |
  | `primary` | `#16857A` | Brand actions, primary CTA buttons |
  | `heading` | `#0D3B39` | High-contrast typography & dark accents |
  | `muted` | `#4D6F6D` | Secondary labels, descriptions, and timestamps |
  | `surface` | `#FFFFFF` | Solid card backgrounds and modal containers |

---

## ☁️ 100% Free Cloud Deployment Topology

The entire platform operates on **100% free cloud tiers**:

```
[GitHub Webhook / Push Event]
             │
             ▼ (<35ms HMAC ACK)
   [Render Free Web Service] ─── (Keep-alive ping every 10 min via cron-job.org)
      FastAPI 0.115+
             │
      ┌──────┴──────────────────────────┐
      │ Celery Task Queue               │ Dual-Cipher Cryptography
      ▼                                 ▼ (AES-256-GCM + HMAC-SHA256)
 [Upstash Redis TLS]               [Neon PostgreSQL 16]
 (Serverless Free Tier)            (Serverless Free Tier)
      │
      ▼ (Background Worker)
 [aegis-cli Standalone Runner]
      │
      ├─► [Slack Incoming Webhook] ───► #aegis-platform Channel (Block Kit Alert)
      │
      └─► [Vercel Next.js 15 UI]  ───► Real-time Triage & Command Palette (Cmd+K)
```

---

## 🚀 Step-by-Step Cloud Deployment Guide

### Step 1: Database (Neon PostgreSQL)
1. Create a free account at [neon.tech](https://neon.tech).
2. Create a project named `aegis-platform` on PostgreSQL 16.
3. Obtain your async connection string:
   ```text
   postgresql+asyncpg://<user>:<password>@<neon-host>/<db>?ssl=require
   ```
4. Migrations are executed automatically by `apps/api/start.sh` upon service startup.

### Step 2: Message Broker & Cache (Upstash Redis)
1. Create a free account at [upstash.com](https://upstash.com).
2. Create a Redis database (e.g. US East region).
3. Copy the **rediss://** connection URL (TLS enabled on port 6379):
   ```text
   rediss://default:<token>@<host>.upstash.io:6379/0
   ```

### Step 3: Slack Incoming Webhook
1. In your Slack workspace, create or open an app at [api.slack.com/apps](https://api.slack.com/apps).
2. Enable **Incoming Webhooks**.
3. Click **Add New Webhook to Workspace** and select your alerts channel (e.g., `#aegis-platform`).
4. Copy the Webhook URL:
   ```text
   https://hooks.slack.com/services/T.../B.../...
   ```

### Step 4: Backend Deployment (Render)
1. Sign in to [render.com](https://render.com).
2. Click **New +** ➔ **Blueprint** (or **Web Service**).
3. Connect your GitHub repository `Ilyan321/aegis-platform`.
4. Render will read `render.yaml` automatically. Configure the environment variables:
   - `DATABASE_URL`: Your Neon asyncpg URL (`postgresql+asyncpg://...`)
   - `REDIS_URL`: Your Upstash rediss URL (`rediss://...`)
   - `SLACK_WEBHOOK_URL`: Your Slack Webhook URL
   - `AEGIS_MASTER_KEY`: 64-character hex string (Render auto-generates this)
   - `AEGIS_BLIND_PEPPER`: 32+ character random string (Render auto-generates this)
5. Click **Apply**. Render will build the Docker container and start FastAPI + Celery concurrently.
6. Note your Render URL: `https://aegis-api.onrender.com`.

### Step 5: Keep-Alive Heartbeat (Preventing Render Cold Starts)
Render free tier web services spin down after 15 minutes of inactivity. To keep your API and worker warm 24/7 with zero cost:
1. Register for a free account at [cron-job.org](https://cron-job.org) or [uptimerobot.com](https://uptimerobot.com).
2. Create a new HTTP monitor:
   - **URL**: `https://aegis-api.onrender.com/health`
   - **Schedule**: Every 10 minutes (`*/10 * * * *`)
   - **Method**: `GET`
3. Aegis responds in <5ms with `{"status":"healthy","service":"aegis-api"}` keeping the instance permanently awake.

### Step 6: Frontend Deployment (Vercel)
1. Sign in to [vercel.com](https://vercel.com) and click **Add New Project**.
2. Import the `Ilyan321/aegis-platform` repository.
3. In project settings:
   - **Root Directory**: `apps/web`
   - **Framework Preset**: `Next.js`
4. Add the Environment Variable:
   - `NEXT_PUBLIC_API_URL`: `https://aegis-api.onrender.com`
5. Click **Deploy**. Vercel will build and publish your Next.js 15 dashboard.

### Step 7: GitHub Webhook Setup
To automate continuous scanning on every code push:
1. Navigate to your target repository on GitHub ➔ **Settings** ➔ **Webhooks** ➔ **Add webhook**.
2. Set **Payload URL**: `https://aegis-api.onrender.com/api/v1/webhooks/github`
3. Set **Content type**: `application/json`
4. Set **Secret**: Your repository's webhook secret (matches `webhook_secret` registered in Aegis).
5. Select events: **Just the `push` event**.
6. Save webhook. Every push will trigger an immediate, authenticated scan with zero developer friction.

---

## 🔒 Security & Cryptographic Architecture

Aegis implements an enterprise-grade **Dual-Cipher Cryptography Engine** (`apps/api/app/core/crypto.py`):
- **AES-256-GCM Envelope Encryption**: Raw secrets detected during scans are never stored in plaintext. They are encrypted using unique 96-bit nonces with authenticated tag validation.
- **HMAC-SHA256 Blind Indexing**: Allows searching and indexing known secrets without ever decrypting database records.
- **SHA-256 Deterministic Fingerprinting**: Generates collision-resistant identifiers based on `hash(repo_id + rule_id + relative_path + normalized_token)`.
- **Idempotency & Auto-Resolution Sweep**: Automatically transitions resolved secrets to `RESOLVED` when removed in subsequent commits, and raises immediate `REGRESSION` alerts if previously resolved credentials reappear.

---

## 💻 Local Development

```bash
# Clone the repository
git clone https://github.com/Ilyan321/aegis-platform.git
cd aegis-platform

# Install dependencies
npm install

# Start local dependencies via Docker Compose
docker compose -f deploy/docker-compose.yml up -d

# Run API backend locally
cd apps/api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
./start.sh

# Run Next.js frontend locally (in another terminal)
cd apps/web
npm run dev
```

Visit `http://localhost:3000` to interact with the dashboard.
API documentation is available at `http://localhost:8000/docs`.
