# Aegis Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Dashboard](https://img.shields.io/badge/Live_Dashboard-aegis--platform.ilyankhan.tech-teal.svg)](https://aegis-platform.ilyankhan.tech)
[![API Status](https://img.shields.io/badge/API_Status-Online-emerald.svg)](https://aegis-platform-wwgp.onrender.com/health)
[![Go Version](https://img.shields.io/badge/Go-1.22+-blue.svg)](https://golang.org)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_15-black.svg)](https://nextjs.org)

Aegis is an open-source secret detection and incident management platform. It prevents developers from accidentally committing API keys, database credentials, tokens, and private keys to git repositories.

Aegis works in two complementary layers:
1. **Local Pre-Commit Guard**: A zero-dependency Go CLI (`aegis`) that intercepts leaks on developer machines in under 10ms before `git commit` finishes.
2. **Central Control Plane**: A web dashboard and API backend that automatically scans pushes via GitHub webhooks, verifies whether leaked credentials are active, sends Slack notifications, and manages incident lifecycles.

---

## Live Deployments

- **Web Dashboard**: [https://aegis-platform.ilyankhan.tech](https://aegis-platform.ilyankhan.tech)
- **API Documentation**: [https://aegis-platform-wwgp.onrender.com/docs](https://aegis-platform-wwgp.onrender.com/docs)
- **API Health Check**: [https://aegis-platform-wwgp.onrender.com/health](https://aegis-platform-wwgp.onrender.com/health)

---

## Key Capabilities

### 1. Instant Local Secret Interception
- Pure Go binary with zero external runtime dependencies.
- Runs in under 10 milliseconds during `git commit` hooks.
- Detects over 40+ credential formats (AWS, GitHub, OpenAI, Anthropic, Stripe, Slack, private keys, database connection strings, JWTs).
- Masks secrets in terminal output to prevent secondary exposure in shell history or CI logs.

### 2. Automated Git Push Scanning
- Native GitHub Webhook integration (`push` events).
- Clones and scans commits asynchronously in the background using Celery task workers.
- Automatically tracks regressions if a previously resolved secret reappears in new commits.

### 3. Active Credential Verification
- Safely probes provider APIs (e.g. AWS STS, GitHub API, OpenAI, Slack) to determine if a detected token is live, revoked, or unverifiable.
- Tags incidents as `ACTIVE` (requires immediate revocation) or `REVOKED`.

### 4. Zero-Plaintext Encrypted Storage
- Secrets are never stored in plaintext in the database.
- Uses AES-256-GCM envelope encryption with authenticated validation tags.
- Uses HMAC-SHA256 blind indexing to allow searching and deduplication without decrypting database records.

### 5. Centralized Incident Triage & Alerts
- Sends rich Block Kit notifications to Slack channels on critical leaks.
- Web dashboard with search, status filtering, severity badges, and quick triage actions (`RESOLVE`, `DISMISS`, `REGRESSION`).
- Built-in Command Palette (`Cmd + K` / `Ctrl + K`) for keyboard navigation.

---

## Quickstart: Install the CLI

Install the Aegis CLI on Linux or macOS with a single command:

```bash
curl -sSL https://aegis-platform.ilyankhan.tech/install.sh | bash
```

For Windows PowerShell:

```powershell
iwr -useb https://aegis-platform.ilyankhan.tech/install.ps1 | iex
```

### Basic CLI Commands

```bash
# Scan the current directory for secrets
aegis scan .

# Scan git staged files only
aegis scan --staged

# Install the automatic pre-commit hook in the current repository
aegis hook install

# Check hook status
aegis hook status

# Verify binary installation and version
aegis version
```

---

## System Architecture

```text
[ Developer Workstation ]
        │
        ▼ (git commit pre-commit hook)
  [ aegis CLI (<10ms local scan) ]
        │
  (Code pushed to GitHub)
        │
        ▼ (Push Webhook)
  [ FastAPI 0.115+ Backend ] ─── (Render Web Service)
        │
        ├─► [ Celery Task Queue ] ──► [ Upstash Redis TLS ]
        │          │
        │          ▼ (Async Background Worker)
        │     [ Clone & Deep Scan ]
        │          │
        │          ├─► [ Live Credential Verification ]
        │          └─► [ Slack Incident Alert ]
        │
        ├─► [ Neon PostgreSQL 16 ] (Encrypted via AES-256-GCM)
        │
        └─► [ Next.js 15 Dashboard ] (Vercel Frontend)
```

---

## Repository Layout

```text
aegis-platform/
├── apps/
│   ├── api/                 # FastAPI backend & Celery worker (Python 3.12+)
│   │   ├── app/             # Application source (api, core, models, schemas, services, workers)
│   │   ├── bin/             # Bundled standalone pure Go aegis-cli binary (Linux x86_64)
│   │   ├── Dockerfile       # Container definition for cloud deployment
│   │   └── requirements.txt # Python dependencies
│   │
│   └── web/                 # Next.js 15 (React 19, Tailwind CSS) Frontend
│       ├── app/             # App Router pages (Dashboard, Incidents, Settings, Telemetry)
│       ├── components/      # UI components (IncidentTable, CommandMenu, Skeletons)
│       └── lib/             # API client and TypeScript definitions
│
├── deploy/                  # Deployment manifests
│   ├── docker-compose.yml   # Multi-service local development setup
│   ├── render.yaml          # Render cloud blueprint specification
│   └── vercel.json          # Vercel frontend specification
│
├── install.sh               # POSIX install script for Linux/macOS
├── install.ps1              # PowerShell install script for Windows
├── LICENSE                  # MIT License
└── package.json             # Root npm workspace configuration
```

---

## Running Locally

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- Go 1.22+ (optional, for compiling the CLI)
- Docker & Docker Compose (optional, for local DB and Redis)

### 1. Clone the repository
```bash
git clone https://github.com/Ilyan321/aegis-platform.git
cd aegis-platform
```

### 2. Start local infrastructure (PostgreSQL & Redis)
```bash
docker compose -f deploy/docker-compose.yml up -d
```

### 3. Start the API Backend
```bash
cd apps/api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
./start.sh
```
The API will be available at `http://localhost:8000`. Interactive OpenAPI documentation will be at `http://localhost:8000/docs`.

### 4. Start the Web Dashboard
```bash
cd ../../apps/web
npm install
npm run dev
```
The dashboard will be available at `http://localhost:3000`.

---

## Environment Variables

### Backend (`apps/api/.env`)

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL async connection string (`postgresql+asyncpg://...`) | Required |
| `REDIS_URL` | Redis connection URL (`redis://...` or `rediss://...`) | Required |
| `AEGIS_MASTER_KEY` | 64-character hex key used for AES-256-GCM envelope encryption | Required |
| `AEGIS_BLIND_PEPPER` | 32+ character random string for HMAC blind indexing | Required |
| `SLACK_WEBHOOK_URL` | Incoming webhook URL for Slack incident alerts | Optional |
| `ENABLE_CELERY_WORKER` | Run Celery background worker inside the web dyno | `true` |
| `CELERY_CONCURRENCY` | Worker concurrency limit | `1` |
| `ENVIRONMENT` | Runtime environment (`development` / `production`) | `development` |

### Frontend (`apps/web/.env.local`)

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the Aegis API backend | `http://localhost:8000` |

---

## Supported Secret Patterns

Aegis includes built-in detection rules for common developer secrets:
- **Cloud Providers**: AWS Access Keys, AWS Secret Keys, GCP API Keys, Azure Connection Strings.
- **AI & ML APIs**: OpenAI API Keys, Anthropic API Keys, HuggingFace Tokens, Cohere Tokens.
- **VCS & CI/CD**: GitHub Personal Access Tokens, GitHub Fine-Grained Tokens, GitLab Tokens.
- **Payment & Messaging**: Stripe Secret Keys, Slack Bot Tokens, Slack Webhook URLs, Twilio Auth Tokens.
- **Databases & Cryptography**: PostgreSQL/MySQL URIs, MongoDB Connection Strings, RSA/SSH Private Keys, JWT Tokens.

---

## License

This project is licensed under the [MIT License](LICENSE).
