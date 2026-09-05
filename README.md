# Aegis Platform (`aegis-platform`)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Architecture: Cloud Native](https://img.shields.io/badge/Architecture-Event--Driven-emerald.svg)]()
[![Stack: FastAPI + Next.js 15](https://img.shields.io/badge/Stack-FastAPI%20%2B%20Next.js%2015-violet.svg)]()

The centralized, cloud-native control plane and orchestration fabric for the **Aegis** security ecosystem.

While `aegis-cli` acts as the edge-level sensor running on workstations and CI runners, `aegis-platform` serves as the central brain: aggregating distributed scan telemetries, managing enterprise repository integrations via GitHub webhooks, orchestrating asynchronous deep scans across remote codebases, tracking credential lifecycle states, dispatching instant incident alerts to Slack channels, and hosting an Apple/Linear-grade operational dashboard.

---

## 🏗️ Architecture & Monorepo Structure

```text
aegis-platform/
├── apps/
│   ├── api/                 # FastAPI 0.115+ Backend & Celery Worker (Python 3.12+)
│   │   ├── app/             # Application source (api, core, models, schemas, services, workers)
│   │   ├── bin/             # Bundled standalone pure Go aegis-cli binary
│   │   ├── Dockerfile       # Container definition for Render cloud web service
│   │   ├── requirements.txt # Python dependencies
│   │   └── start.sh         # Startup script (Alembic + Celery + Uvicorn)
│   └── web/                 # Next.js 15 (React 19, Tailwind CSS, shadcn/ui) Frontend
│       ├── app/             # App Router pages and layouts
│       ├── lib/             # Utility helpers (cn, api clients)
│       └── public/          # Static assets
├── deploy/                  # Cloud & local deployment manifests
│   ├── docker-compose.yml   # Multi-service local dev composition
│   ├── init.sql             # PostgreSQL extensions initialization (uuid, pgcrypto)
│   ├── render.yaml          # Render blueprint for 1-click cloud backend deployment
│   └── vercel.json          # Vercel deployment specification for Next.js frontend
├── AEGIS_CLI_SPEC.md        # Technical data contract & JSON schema for aegis-cli
├── PRD.md                   # Product Requirements Document
└── package.json             # Root npm workspace configuration
```

---

## ☁️ 100% Free Cloud Deployment Topology

The entire platform is designed to operate on **100% free cloud tiers**:

1. **Frontend (`apps/web`)**: Deployed to **Vercel** (Hobby Plan — $0).
2. **Backend & Celery Worker (`apps/api`)**: Deployed to **Render** (Free Web Service — $0).
   * Render free tier containers sleep after 15 minutes of inactivity. Set up a free HTTP monitor (e.g. **cron-job.org** or **UptimeRobot**) pinging `https://<your-render-app>.onrender.com/health` every 10 minutes to maintain 24/7 uptime.
3. **Database**: **Neon** (`neon.tech`) or **Supabase** (`supabase.com`) PostgreSQL 16 free tier ($0).
4. **Message Broker / Cache**: **Upstash Redis** (`upstash.com`) serverless Redis free tier ($0, 10k commands/day).
5. **Real-time Incident Alerts**: **Slack Incoming Webhooks** ($0, Slack Block Kit cards).

---

## 🚀 Getting Started

### Local Development (Quick Start)

```bash
# 1. Install root & frontend dependencies
npm install

# 2. Configure environment variables for API
cp apps/api/.env.example apps/api/.env

# 3. Start local Postgres & Redis using Docker Compose
docker compose -f deploy/docker-compose.yml up -d postgres redis

# 4. Start the frontend
npm run dev
```

### Health Check
Verify the API status:
```bash
curl http://localhost:8000/health
# {"status":"healthy","service":"aegis-api","timestamp":"...","version":"1.0.0"}
```
