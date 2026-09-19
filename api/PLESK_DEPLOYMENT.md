# Deploying shega-admin-api on Plesk

Target: **api.afran.net** served by Plesk's Node.js application handler, connected
to a MySQL 8.0 database on the same host. The MySQL port (`3306`) is **not
exposed to the internet** — all DB traffic stays local to the server.

## Prerequisites

- Plesk with the **Node.js** extension installed (use **Node.js 22**).
- A MySQL 8.0 database + user (local connection only — no `GRANT ... TO ...@'%'` needed; grant to `localhost`/`127.0.0.1`).

## 1. Push the code

```bash
git push origin main
```

The `api/` directory is served from the repo clone on the server.

## 2. Configure the Node.js app

In Plesk → **Domains → api.afran.net → Node.js**:

| Setting                 | Value                                        |
|-------------------------|----------------------------------------------|
| Application root        | path to the directory containing `api/`      |
| Application startup file| `dist/server.js`                             |
| Application mode        | Production                                   |

Set these **Environment Variables** in Plesk (never commit secrets):

```
NODE_ENV=production
DATABASE_URL=mysql://shega_admin_user:<password>@127.0.0.1:3306/shega_admin
JWT_SECRET=<random 32+ chars — openssl rand -hex 32>
CORS_ALLOWED_ORIGINS=https://afran.net,https://www.afran.net
PUBLIC_API_URL=https://api.afran.net/api
RATE_LIMIT_LOGIN=10
RATE_LIMIT_GLOBAL=0
TRUST_PROXY=1
```

> **Password character encoding** — if your MySQL password contains `@` or `!`
> (as `nat@1234!` does), URL-encode them:
> `@` → `%40`, `!` → `%21`
>
> Example:
> ```
> DATABASE_URL=mysql://shega_admin_user:nat%401234%21@127.0.0.1:3306/shega_admin
> ```

## 3. Build + migrate + seed + start (on the server)

```bash
cd <api root>

# install + generate + build
npm ci
npx prisma generate
npm run build

# create all tables (applies 0001_init — no MySQL port exposure needed)
npx prisma migrate deploy

# seed the admin account (requires a strong password via env)
SEED_ADMIN_PASSWORD=<your-strong-password-here> npx tsx prisma/seed.ts

# start the API
npm start
```

> **Seed password requirements** — must be supplied via the environment (no
> hardcoded default in production). Minimum 12 characters. Set the value once
> in Plesk's environment variables if you prefer, or pass inline as shown.

## 4. Verify

From any machine with network access to the server:

```bash
# health check
curl -i https://api.afran.net/health

# login smoke test
curl -i -X POST https://api.afran.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<same strong password>"}'
```

Expected: `200` with `{access, refresh, user}`.

## 5. Connect the frontend

In the Next.js admin panel:

```
NEXT_PUBLIC_API_URL=https://api.afran.net/api
```

Rebuild/restart the frontend. Verify you can log in via the admin UI.

## 6. Legacy data migration (last step, only after everything works)

Once the above is green, run the PostgreSQL → MySQL data copy. This requires
`LEGACY_DATABASE_URL` pointing at the old Django database (host/port accessible
from the same network). **Do not expose the legacy database publicly.**

```bash
LEGACY_DATABASE_URL="postgres://user:pass@<legacy-host>:5432/shega" \
  npx tsx scripts/migrate-data.ts
```

See [MIGRATION.md](MIGRATION.md) for details.

## Notes

- **DB connectivity**: the MySQL connection string in Plesk should use
  `127.0.0.1:3306` (local loopback). The DB is only reachable from the server;
  it is not internet-accessible.
- **CORS**: put only the frontend origins in `CORS_ALLOWED_ORIGINS`.
  `credentials: true` is enabled.
- **Uploads**: the new API does not serve receipt images; `receipt_image` on
  payments is a stored path only.
- **Reverse proxy / trust proxy**: set to `1` (Plesk proxies to the app);
  `X-Forwarded-For` is used for audit and rate-limit IP tracking.
- **Backups**: enable Plesk's scheduled MySQL dumps of `shega_admin`.
- **Graceful shutdown**: the app disconnects Prisma on SIGINT/SIGTERM.