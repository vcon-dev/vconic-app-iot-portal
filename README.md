# vConic IoT Management Portal

A full-stack web portal for managing vCon uploads from IoT recording devices. Built as a pnpm monorepo with a React + Vite frontend and an Express + PostgreSQL backend.

---

## What is a vCon?

A [vCon](https://datatracker.ietf.org/doc/draft-ietf-vcon-vcon-container/) is an open-standard JSON container for recorded conversations — phone calls, voice memos, audio meetings. Each vCon carries structured metadata (parties, timestamps, subject), dialog segments with optional base64-encoded audio, analysis results, and attachments. This portal receives vCons from embedded IoT recorders, stores them, and can forward them to downstream systems via configurable webhook rules.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Replit Proxy                          │
│  /api/* and /ingress → API server (port 8080)           │
│  everything else     → Portal SPA (static)              │
└──────────────┬──────────────────────────┬───────────────┘
               │                          │
   ┌───────────▼──────────┐  ┌────────────▼────────────┐
   │  Express API Server  │  │  React + Vite Portal    │
   │  artifacts/api-server│  │  artifacts/portal       │
   │                      │  │                         │
   │  Auth, Devices,      │  │  Dashboard, vCon        │
   │  vCon ingest,        │  │  viewer, Device mgmt,   │
   │  Gateway routing,    │  │  Routing rules, OTA,    │
   │  OTA delivery,       │  │  Settings, Help         │
   │  Repost rules        │  │                         │
   └───────────┬──────────┘  └─────────────────────────┘
               │
   ┌───────────▼──────────┐
   │  PostgreSQL + Drizzle│
   │  (Replit managed DB) │
   └──────────────────────┘
```

---

## Features

| Feature | Description |
|---|---|
| **User auth** | Registration, login, JWT sessions, password reset via email (Resend) |
| **Device registry** | Register M5Stack and other IoT recorders; each device gets a unique ingest token |
| **Dual ingest paths** | Direct token ingest (`/api/ingest/:token`) or smart gateway (`/ingress`) |
| **Gateway routing** | Routes vCons by query token → embedded vConic ID → MAC address → unassigned queue |
| **Unassigned queue** | vCons from unknown devices are held and can be assigned retroactively |
| **Auto-claim** | Registering a device automatically sweeps the unassigned queue for matching vCons |
| **vCon viewer** | Full inspector: parties, dialog with audio playback, analysis, raw JSON, tags |
| **vCon archive** | Paginated table with tag badges, download button, per-user storage limits |
| **Repost rules** | Webhook forwarding rules scoped to all devices or a single device |
| **OTA firmware** | Upload `firmware.bin` and set a version string; devices poll public endpoints |
| **Settings** | Storage usage bar, vCon limit, auto-purge of oldest records when limit exceeded |
| **Theme** | Dark / Light / System theme toggle |
| **Help docs** | Searchable in-app documentation (26 articles across 8 categories) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces |
| Runtime | Node.js 24 |
| Language | TypeScript 5.9 |
| API framework | Express 5 |
| Database | PostgreSQL (Replit managed) + Drizzle ORM |
| Validation | Zod v4 + drizzle-zod |
| API codegen | Orval (OpenAPI → React Query hooks + Zod schemas) |
| API build | esbuild (single ESM bundle) |
| Frontend build | React 19 + Vite 6 |
| UI components | shadcn/ui + Tailwind CSS v4 |
| Client state | TanStack Query v5 |
| Routing | Wouter |
| Email | Resend |
| Auth | JWT in `localStorage`, scrypt password hashing |
| Logging | pino + pino-http |

---

## Project Structure

```
vconic-portal/
├── artifacts/
│   ├── api-server/              # Express API (port 8080)
│   │   ├── src/
│   │   │   ├── app.ts           # Express app setup
│   │   │   ├── index.ts         # Server entrypoint
│   │   │   ├── middlewares/
│   │   │   │   └── auth.ts      # JWT requireAuth middleware
│   │   │   ├── lib/
│   │   │   │   ├── auth.ts      # Token generation, password hashing
│   │   │   │   └── logger.ts    # pino logger
│   │   │   └── routes/
│   │   │       ├── auth.ts      # Login, register, password reset
│   │   │       ├── devices.ts   # Device CRUD + auto-claim
│   │   │       ├── ingest.ts    # Direct device token ingest
│   │   │       ├── gateway.ts   # Smart gateway routing + unassigned queue
│   │   │       ├── vcons.ts     # vCon list, detail, download, delete
│   │   │       ├── rules.ts     # Repost webhook rules
│   │   │       ├── admin.ts     # Unassigned device management
│   │   │       ├── ota-admin.ts # OTA firmware upload + public serving
│   │   │       ├── settings.ts  # Per-user storage settings
│   │   │       ├── dashboard.ts # Stats + activity feed
│   │   │       └── health.ts    # Health check
│   │   ├── ota-files/           # Uploaded firmware.bin and version.txt (runtime)
│   │   └── build.mjs            # esbuild bundler script
│   │
│   └── portal/                  # React + Vite SPA
│       └── src/
│           ├── App.tsx           # Routes
│           ├── pages/
│           │   ├── login.tsx / register.tsx
│           │   ├── forgot-password.tsx / reset-password.tsx
│           │   ├── dashboard.tsx
│           │   ├── devices-list.tsx / device-new.tsx / device-detail.tsx
│           │   ├── vcons-list.tsx / vcon-detail.tsx
│           │   ├── rules-list.tsx / rule-new.tsx / rule-edit.tsx
│           │   ├── unassigned-devices.tsx
│           │   ├── ota.tsx
│           │   ├── settings.tsx
│           │   └── help.tsx
│           └── components/
│               ├── layout.tsx    # Sidebar nav + theme toggle
│               └── ui/           # shadcn/ui components
│
├── lib/
│   ├── api-spec/                # OpenAPI 3.1 spec + Orval config
│   ├── api-client-react/        # Generated TanStack Query hooks
│   ├── api-zod/                 # Generated Zod schemas
│   └── db/                      # Drizzle schema + DB connection
│       └── src/schema.ts
│
├── scripts/                     # Utility scripts (DB push, codegen)
├── pnpm-workspace.yaml
└── tsconfig.json                # Composite project references
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `users` | Portal accounts — email, name, scrypt password hash |
| `sessions` | JWT session tokens with 30-day expiry |
| `password_reset_tokens` | 1-hour email reset tokens |
| `devices` | Registered IoT devices — name, type, MAC, vConic ID, unique token |
| `vcons` | Stored vCon records — JSONB columns for parties/dialog/analysis/attachments/extensions, raw JSON, tags |
| `rules` | Repost webhook rules — method, target URL, custom headers, device scope, success/failure counters |
| `unassigned_vcons` | vCons from unrecognized devices pending manual assignment |
| `activity` | Audit log for the dashboard activity feed |
| `user_settings` | Per-user storage limit (default 1000 vCons); triggers auto-purge of oldest records |

---

## Environment Variables / Secrets

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (provided by Replit) |
| `SESSION_SECRET` | Yes | Secret used to sign JWTs |
| `RESEND_API_KEY` | Yes | Resend API key for password reset emails |
| `RESEND_FROM_EMAIL` | No | Sender address (default: `no-reply@vconic.net`) |
| `PORT` | No | API server port (default: `8080`) |

---

## Development Setup

### Prerequisites

- Node.js 24
- pnpm 9+
- A PostgreSQL database (or use the Replit built-in)

### Install

```bash
pnpm install
```

### Push the database schema

```bash
pnpm --filter @workspace/db run push
```

### Run in development

Both workflows run concurrently. In Replit they start automatically:

```bash
# API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Portal (Vite dev server)
pnpm --filter @workspace/portal run dev
```

### Regenerate the API client after spec changes

```bash
pnpm --filter @workspace/api-spec run codegen
```

### Typecheck everything

```bash
pnpm run typecheck
```

---

## API Reference

All protected routes require `Authorization: Bearer <jwt>`.

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Create account |
| `POST` | `/api/auth/login` | No | Login, returns JWT |
| `POST` | `/api/auth/logout` | Yes | Invalidate session |
| `GET` | `/api/auth/me` | Yes | Current user info |
| `POST` | `/api/auth/forgot-password` | No | Send password reset email |
| `POST` | `/api/auth/reset-password` | No | Consume reset token, set new password |

### Devices

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/devices` | Yes | List your devices |
| `POST` | `/api/devices` | Yes | Register a device (auto-claims matching unassigned vCons) |
| `GET` | `/api/devices/:id` | Yes | Device detail |
| `PUT` | `/api/devices/:id` | Yes | Update device (auto-claims on identifier change) |
| `DELETE` | `/api/devices/:id` | Yes | Delete device |
| `POST` | `/api/devices/:id/token` | Yes | Regenerate device ingest token |
| `GET` | `/api/devices/:id/vcons` | Yes | vCons for this device |

### vCon Ingest

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/ingest/:deviceToken` | Device token | Direct ingest from a registered device |
| `POST` | `/ingress` | None | Smart gateway — routes by token/MAC/vConicID or queues as unassigned |

### vCons

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/vcons` | Yes | List vCons (paginated, filterable) |
| `GET` | `/api/vcons/:id` | Yes | vCon detail with full JSONB fields |
| `DELETE` | `/api/vcons/:id` | Yes | Delete a vCon |
| `GET` | `/api/vcons/:id/download` | Yes | Download raw vCon JSON |

### Repost Rules

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/rules` | Yes | List rules |
| `POST` | `/api/rules` | Yes | Create rule |
| `GET` | `/api/rules/:id` | Yes | Rule detail |
| `PUT` | `/api/rules/:id` | Yes | Update rule |
| `DELETE` | `/api/rules/:id` | Yes | Delete rule |

### Unassigned Queue

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/unassigned` | Yes | Grouped unassigned vCons |
| `POST` | `/api/admin/unassigned/:identifier/assign` | Yes | Assign to existing device |
| `POST` | `/api/admin/unassigned/:identifier/create-account` | Yes | Create new user+device and claim vCons |
| `DELETE` | `/api/admin/unassigned/:identifier` | Yes | Discard queued vCons |

### OTA Firmware

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/ota/version.txt` | **No** | Current firmware version string (polled by devices) |
| `GET` | `/api/ota/firmware.bin` | **No** | Firmware binary download (polled by devices) |
| `GET` | `/api/ota/status` | Yes | OTA status: version, firmware size, last modified |
| `PUT` | `/api/ota/version` | Yes | Set version string (semver) |
| `POST` | `/api/ota/firmware` | Yes | Upload firmware as base64 JSON body |

### Dashboard & Settings

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/dashboard/stats` | Yes | vCon count, device count, storage usage |
| `GET` | `/api/dashboard/recent` | Yes | Recent activity log |
| `GET` | `/api/settings` | Yes | User storage settings |
| `PUT` | `/api/settings` | Yes | Update max vCon limit |

---

## Device Integration Guide

### Option A — Direct ingest (recommended for production)

Register your device in the portal and use the generated ingest URL. Each device gets a unique token.

```
POST https://your-app.replit.app/api/ingest/dvt_xxxxxxxxxxxx
Content-Type: application/json

{ <vCon JSON> }
```

The URL with the embedded token is shown in the portal on the device's detail page.

### Option B — Smart gateway (zero-config)

Post to the public gateway endpoint. The gateway routes the vCon automatically:

```
POST https://your-app.replit.app/ingress
Content-Type: application/json

{ <vCon JSON> }
```

**Routing priority:**
1. `?token=dvt_xxx` query param or `X-Device-Token` header → matched device token
2. `?token=VC-XXXXXX` → matched vConic serial (vconicId)
3. `meta.mac_address` or `parties[0].meta.device_id` inside the vCon body → matched MAC
4. `meta.vconic_id` or `parties[0].meta.vconic_id` inside the vCon body → matched vConic serial
5. No match → stored in the **Unassigned Queue** for manual assignment

**Auto-claim:** When you register a device with a `vconicId` or `macAddress`, any vCons already in the unassigned queue with that identifier are automatically migrated to your archive.

---

## OTA Firmware Delivery

Devices poll two unauthenticated endpoints to check for and download updates:

```
GET /api/ota/version.txt   → plain text version string, e.g. "1.0.4"
GET /api/ota/firmware.bin  → raw binary, Content-Length set for ESP32 Update library
```

Both return `Cache-Control: no-store` and an explicit `Content-Length` so the ESP32 `Update` library can allocate flash correctly.

### Uploading firmware from the command line

```bash
# 1. Authenticate
TOKEN=$(curl -s -X POST https://your-app.replit.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# 2. Upload firmware (Linux: base64 -w0 / macOS: base64 -b 0)
curl -X POST https://your-app.replit.app/api/ota/firmware \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"firmwareBase64\":\"$(base64 -w0 firmware.bin)\"}"

# 3. Set the version string
curl -X PUT https://your-app.replit.app/api/ota/version \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"version":"1.0.5"}'

# 4. Verify (no auth — same as device)
curl https://your-app.replit.app/api/ota/version.txt
curl -I https://your-app.replit.app/api/ota/firmware.bin
```

### Firmware config.h

```cpp
#define FIRMWARE_VERSION  "1.0.4"
#define OTA_VERSION_URL   "https://your-app.replit.app/api/ota/version.txt"
#define OTA_FIRMWARE_URL  "https://your-app.replit.app/api/ota/firmware.bin"
```

---

## Gateway Routing Notes

The Replit reverse proxy routes:
- `/api/*` → API server
- `/ingress` → API server (rewritten to `/api/gateway`)
- Everything else → Portal SPA (Vite static build)

This means device-facing OTA endpoints **must** be under `/api/` — bare paths like `/version.txt` are intercepted by the portal's catch-all and return `index.html`.

---

## Deployment

The portal is deployed on Replit's Autoscale platform. The API server builds to a single ESM bundle via esbuild and runs with `node --enable-source-maps`.

```bash
# Build everything
pnpm run build

# The Replit deployment runner then starts:
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

The portal's Vite build output (`artifacts/portal/dist/public`) is served as static files by the Replit proxy directly, without going through the Express server.

> **OTA file persistence:** `artifacts/api-server/ota-files/` is written at runtime. On autoscale deployments this is ephemeral — re-upload firmware after a cold start, or extend the API to store firmware in the database or object storage for true persistence.
