# Deploying Shega (Next.js + Node API) on Plesk

Target: **https://shega.com** serves the Next.js app; `https://shega.com/api/*` is
reverse-proxied by Next.js `rewrites()` to the Node API listening on
`127.0.0.1:3001` on the **same host**. MySQL 8.0 lives on the same host and is
**not exposed to the internet**.

```
Browser ──> https://shega.com (Next.js, Plesk Node app, port 3000)
               │  rewrites() /api/:path*  ──► http://127.0.0.1:3001/api
               ▼
           Node API (Express + Prisma, Plesk Node app, bound to 127.0.0.1)
               ▼
           MySQL 8.0 (shega_admin, localhost:3306)
```

Because the browser only ever talks to the same origin (`shega.com`), there are
no CORS issues and cookies/headers stay first-party. No `api.` subdomain needs
to be public.

## Prerequisites

- Plesk with the **Node.js** extension (use **Node.js 22**).
- A MySQL 8.0 database `shega_admin` + user, granted for `localhost`/`127.0.0.1`
  only.
- Two Node apps are needed on the host (Plesk runs one Node app per
  domain/subdomain):
  1. `shega.com` → Next.js frontend
  2. an **internal-only** subdomain (e.g. `api.shega.com` with no public DNS, or
     protected by Plesk firewall / Access Control) → Node API

## 1. Push the code

```bash
git push origin main
```

Both `api/` and `frontend/` live in the same clone.

## 2. Bootstrap on the server

```bash
# API
cd /path/to/repo/api
npm ci
npx prisma generate
npm run build
npx prisma migrate deploy          # applies 0001_init + 0002_shega_tiers

# seed the admin account (strong password required via env, min 12 chars)
SEED_ADMIN_PASSWORD='<your-strong-password>' npx tsx prisma/seed.ts

# Frontend
cd ../frontend
npm ci
npm run build                       # DO NOT set NEXT_PUBLIC_API_URL at build time
```

## 3. Configure the Admin Node API (internal subdomain)

Plesk → **Domains → api.shega.com → Node.js**:

| Setting                  | Value                              |
|--------------------------|------------------------------------|
| Application root         | `<repo>/api`                       |
| Application startup file | `dist/server.js`                   |
| Application mode         | Production                         |

Environment Variables (never commit secrets — URL-encode `@`→`%40`, `!`→`%21`
in the MySQL password):

```
NODE_ENV=production
PORT=3001
HOSTNAME=127.0.0.1
PUBLIC_API_URL=https://shega.com/api
DATABASE_URL=mysql://shega_admin_user:<password>@127.0.0.1:3306/shega_admin
JWT_SECRET=<openssl rand -hex 32>
CORS_ALLOWED_ORIGINS=https://shega.com,https://www.shega.com
RATE_LIMIT_GLOBAL=0
RATE_LIMIT_LOGIN=10
RATE_LIMIT_REGISTER=5
RATE_LIMIT_ADMIN=600
TRUST_PROXY=1
```

`HOSTNAME=127.0.0.1` binds the API to loopback only — it is reachable from the
frontend app on the same host but not from the internet.

## 4. Configure the Next.js frontend (shega.com)

`next.config.ts` already sets `output: "standalone"` and an `async rewrites()`
rule that proxies `/:path*` under `/api` to `process.env.API_PROXY_TARGET`
(default `http://127.0.0.1:3001`).

Build the self-contained server and copy the static assets Next does not inline:

```bash
cd frontend
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```

Plesk → **Domains → shega.com → Node.js**:

| Setting                  | Value                                   |
|--------------------------|-----------------------------------------|
| Application root         | `<repo>/frontend`                       |
| Application startup file | `.next/standalone/server.js`            |
| Application mode         | Production                              |

Environment Variables:

```
PORT=3000
HOSTNAME=<Plesk-proxied interface, typically 127.0.0.1>
API_PROXY_TARGET=http://127.0.0.1:3001
NEXT_PUBLIC_API_URL=/api
```

If your Plesk Node proxy expects the app to accept the proxied port, set
`PORT` to that port and make `API_PROXY_TARGET` point at the API as shown.
Keep `NEXT_PUBLIC_API_URL=/api` (same-origin) so the browser uses the rewrite
rather than calling a different domain.

## 5. Verify

```bash
# frontend + proxy chain
curl -i https://shega.com/api/plans          # 200, array of 3 plans
curl -i -X POST https://shega.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<same strong seed password>"}'
# expected: 200 { access, refresh, user }

# the API must NOT be reachable publicly
curl -i https://api.shega.com/api/health      # expect connection refused / 403
```

## 6. Legacy data migration (last, only after green)

```bash
cd api
LEGACY_DATABASE_URL="postgres://user:pass@<legacy-host>:5432/shega" \
  npx tsx scripts/migrate-data.ts
```

See [MIGRATION.md](MIGRATION.md). Never expose the legacy database publicly.

## 7. Running the tests (local machine)

```bash
cd api
npm test          # vitest + supertest, expects DATABASE_URL in api/.env
```

The suite seeds its own admin + plans and wipes non-admin rows between files,
so it targets a dedicated test DB, e.g. `shega_admin_test`.

## Operational notes

- **DB connectivity**: MySQL connection string uses `127.0.0.1:3306` (loopback
  only). Never grant `...@'%'`.
- **CORS**: irrelevant in same-origin mode, but keep `CORS_ALLOWED_ORIGINS`
  limited to `https://shega.com` for the development split-domain case.
- **Expiry**: licenses expire via date comparison; admins can force
  expiry via `POST /api/licenses/licenses/:id/expire`. No background scheduler
  is required (matches the legacy Django behaviour).
- **Uploads**: the API does not serve receipt images; `receipt_image` on
  payments is a stored path only.
- **Trust proxy**: `TRUST_PROXY=1` (Plesk nginx proxies to the app);
  `X-Forwarded-For` is used for audit and rate-limit IP tracking.
- **Backups**: enable Plesk's scheduled MySQL dumps of `shega_admin`.
- **Graceful shutdown**: the API disconnects Prisma on SIGINT/SIGTERM (Plesk
  sends SIGTERM on app restart).
- **Idempotent deploy**: `npx prisma migrate deploy` only applies new
  migrations; it is safe to run on every deploy.