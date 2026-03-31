# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains the vConic IoT vCon Management Portal.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Auth**: JWT stored in localStorage, custom scrypt password hashing

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── portal/             # React + Vite frontend (vConic Portal)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── attached_assets/        # Logo and sample vCon files
└── pnpm-workspace.yaml
```

## vConic Portal Features

- **User registration & authentication** — account creation, login, JWT session management
- **IoT device registration** — register M5Stack and other recording devices
- **Per-device upload endpoints** — unique ingest URLs per device (`/api/ingest/:deviceToken`)
- **vCon viewer** — inspect full vCon structure: parties, dialog, analysis, attachments, raw JSON
- **Repost routing rules** — configure webhook destinations for vCon forwarding

## Database Schema

- `users` — registered portal users
- `sessions` — JWT session tokens (30-day expiry)
- `devices` — registered IoT devices with unique tokens
- `vcons` — stored vCon records with JSONB columns for parties/dialog/analysis/attachments
- `rules` — repost routing rules with HTTP method, target URL, headers, filter conditions
- `activity` — audit log for dashboard activity feed

## API Routes

- `POST /api/auth/register` — user registration
- `POST /api/auth/login` — user login
- `POST /api/auth/logout` — logout (requires auth)
- `GET /api/auth/me` — current user (requires auth)
- `GET/POST /api/devices` — list/create devices (requires auth)
- `GET/PUT/DELETE /api/devices/:id` — device CRUD (requires auth)
- `POST /api/devices/:id/token` — regenerate device token (requires auth)
- `GET /api/devices/:id/vcons` — list device's vCons (requires auth)
- `POST /api/ingest/:deviceToken` — IoT device vCon upload (device token auth)
- `GET/POST /api/vcons` — list/view vCons (requires auth)
- `GET/DELETE /api/vcons/:id` — vCon detail/delete (requires auth)
- `GET/POST /api/rules` — list/create repost rules (requires auth)
- `GET/PUT/DELETE /api/rules/:id` — rule CRUD (requires auth)
- `GET /api/dashboard/stats` — dashboard statistics (requires auth)
- `GET /api/dashboard/recent` — recent activity feed (requires auth)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes
