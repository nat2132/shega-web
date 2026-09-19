# shega-admin-api

Drop-in replacement for the legacy Django `admin_api` used by the SHEGA Next.js
admin panel. Node.js (>= 22) + Express + TypeScript + Prisma on **MySQL 8.0**.

The API keeps DRF-compatible shapes (`{access, refresh, user}`, paginated
lists `{count, next, previous, results}`, `{detail}` errors, ISO dates) so the
existing frontend works without changes. It serves **admin-only** endpoints; the
legacy customer/portal endpoints are intentionally **not** re-implemented
(see [API.md](API.md) → "Dropped endpoints").

## Stack

- Express 4 · TypeScript 5 · Prisma Client 5 (`mysql` connector)
- Auth: JWT (access 1h / refresh 30d with rotation) + bcrypt for new passwords
  and Django `pbkdf2_sha256` verification for migrated users
- Login lockout: 5 failures / 15 min per identifier (mirrors Django throttles)
- `zod` validation, rate limiting, helmet, morgan logging

## Layout

```
api/
  prisma/schema.prisma      MySQL schema, @@map-ed to the legacy Django tables
  prisma/seed.ts            creates the original admin account
  scripts/migrate-data.ts   one-time PostgreSQL → MySQL copy
  src/config/env.ts         typed environment access
  src/lib/                  prisma, password, tokens, serializers, errors, …
  src/middleware/           auth (requireAuth/requireAdmin), error handling
  src/modules/              auth, businesses, plans, subscriptions, payments,
                            trials, licenses, settings, app-versions, dashboard,
                            audit-logs, admin-users
  src/app.ts                Express app + routing table
  src/server.ts             entrypoint
```

## Quick start (dev)

```bash
npm install
npx prisma generate

# 1. create a MySQL database and fill in api/.env (see .env.example):
#    DATABASE_URL="mysql://user:pass@127.0.0.1:3306/shega_admin"

# 2. create/refresh the schema + seed the admin account:
npx prisma migrate dev --name init
npx prisma db seed

# 3. run:
npm run dev          # http://localhost:3001/api
```

Login with the seeded admin credentials (see `prisma/seed.ts`).

## Data migration from the Django/PostgreSQL backend

See [MIGRATION.md](MIGRATION.md) for the full mapping and runbook. In short:

```bash
LEGACY_DATABASE_URL="postgres://…shega" npm run migrate:data
```

## Config

| Env var                  | Default                    | Purpose |
|--------------------------|----------------------------|---------|
| `PORT`                   | `3001`                     | HTTP port |
| `PUBLIC_API_URL`         | `http://localhost:3001/api`| Absolute API base |
| `DATABASE_URL`           | — (required)               | Prisma MySQL connection string |
| `LEGACY_DATABASE_URL`    | —                          | PostgreSQL source for `migrate:data` |
| `JWT_SECRET`             | — (required)               | Access/refresh signing key |
| `JWT_ACCESS_TTL`         | `1h`                       | Access token lifetime |
| `JWT_REFRESH_TTL`        | `30d`                      | Refresh token lifetime |
| `CORS_ALLOWED_ORIGINS`   | `http://localhost:3000`    | Comma-separated allowed origins |
| `LOGIN_LOCKOUT_THRESHOLD`| `5`                        | Failed logins to lock an identifier |
| `LOGIN_LOCKOUT_WINDOW_MINUTES` | `15`               | Lockout window |
| `RATE_LIMIT_GLOBAL`      | `0` (off)                  | Global per-minute limit |
| `RATE_LIMIT_LOGIN`       | `10`                       | Login per-minute limit |
| `TRUST_PROXY`            | `1`                        | Trust X-Forwarded-For hops |

## Scripts

```bash
npm run dev              # tsx watch
npm run build            # tsc → dist/
npm start                # node dist/server.js
npm run typecheck        # tsc --noEmit
prisma:generate          # build Prisma client
prisma:migrate           # prisma migrate dev
prisma:deploy            # prisma migrate deploy
migrate:data             # PostgreSQL → MySQL copy
```

Deployment to Plesk: see [PLESK_DEPLOYMENT.md](PLESK_DEPLOYMENT.md).