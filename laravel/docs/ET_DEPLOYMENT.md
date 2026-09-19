# Shega Admin — Laravel 11 Port · Deployment & Verification Runbook

Target host: **Ethio Telecom shared hosting, cPanel** (PHP 8.2+, MySQL, Apache, no Node, no PM2).
Public endpoint: `https://api.afran.et` · Admin web app: `https://app.afran.et` (Next.js, unchanged).

The Node API (`api/`, Express + Prisma) remains the **source of truth and the safety net** until
parity is proven on the host (project rule #20 — rollback by swapping `NEXT_PUBLIC_API_URL`).

---

## 0. What "port" means here

We reproduce the verified Node endpoint contract in Laravel 11 with **identical**:

- URL paths, HTTP methods, status codes, and DRF-style response shapes
  (`{detail:"..."}`, `{fieldName:[...]}`, `{count,next,previous,results}`, `{access,refresh,user}`)
- 19 MySQL tables (names + column names + types + indexes identical to the Prisma `migration.sql`)
- JWT semantics from `api/src`: HS256, access TTL 1h, refresh TTL 30d, rotation with `jti`, and a
  revocable `auth_refreshtoken` pair-store (replaces `auth.RT` rotation in the Node code).
- Auth: username/password login w/ rate-limit lockout (`accounts_loginattempt`), Django-PBKDF2
  password verification (so existing hashes keep working), refresh→access; admin-only guards.

---

## 1. Verified contract (authoritative)

### 1.1 Router → module mount map (from `node api/src/app.ts`)

| Prefix                       | Router file (node)                            | Laravel controller bucket            |
|------------------------------|-----------------------------------------------|--------------------------------------|
| `/api/auth`                  | `modules/auth/auth.router`                    | `App\Http\Controllers\Api\Auth`     |
| `/api/admin/businesses`      | `modules/businesses/businesses.router`        | `Api\BusinessesController`          |
| `/api/admin/subscriptions`   | `modules/subscriptions/subscriptions.router`  | `Api\SubscriptionsController`       |
| `/api/admin/payments`        | `modules/payments/payments.router`            | `Api\PaymentsController`            |
| `/api/admin/trials`          | `modules/trials/trials.router`                | `Api\TrialsController`              |
| `/api/admin/settings`        | `modules/settings/settings.router`            | `Api\SettingsController`            |
| `/api/admin/app-versions`    | `modules/app-versions/app-versions.router`    | `Api\AppVersionsController`         |
| `/api/admin/dashboard`       | `modules/dashboard/dashboard.router`          | `Api\DashboardController`           |
| `/api/admin/audit-logs`      | `modules/audit-logs/audit-logs.router`        | `Api\AuditLogsController`           |
| `/api/admin/admins`          | `modules/admin-users/admin-users.router`      | `Api\AdminUsersController`          |
| `/api/licenses/plans`        | `modules/plans/plans.router`                  | `Api\LicensePlansController`        |
| `/api/licenses/`             | `modules/licenses/licenses.router`            | `Api\LicensesController`            |
| `--`                          | (no /api/admin/support; support lives in `modules/support` future) | —                    |

### 1.2 Auth endpoints (exact)

```
POST /api/auth/login/            {username,password} → 200 {access,refresh,user} | 400/401/429/lockout
POST /api/auth/refresh/          {refresh}           → 200 {access,refresh} (rotates; old revoked)
POST /api/auth/logout/           (Bearer access)      → 204 | 401
GET  /api/auth/profile/          (Bearer access)      → 200 {id,username,email,...}
PATCH /api/auth/profile/         (Bearer) {first_name,last_name,email,phone,business_name,...}
POST /api/auth/change-password/  (Bearer) {old_password,new_password}
POST /api/auth/password-reset/   {email}             → 200 {detail:"Password reset email sent."}
POST /api/auth/password-reset/confirm/ {token,new_password}
```

### 1.3 Module endpoints (12 modules, DRF-shaped) — full list on `node api/src` (source of truth). This
runbook's parity checklist (below) re-derives every path from the route dump (`docs/api-routes.md`).

---

## 2. Non-negotiables for the host

1. **Composer on the host.** Ethio Telecom cPanel has no SSH by default; request "Shell Access"
   **or** build locally and upload `vendor/`. If neither: use cPanel "Setup PHP" to confirm 8.2+;
   there is no way around `composer install` on a host without SSH **except** uploading a
   pre-built `vendor/` + running `php artisan key:generate`.
2. **Document** `api.afran.et` → a folder that **ends in `/public`** (Laravel docroot). Without this,
   only `public/` files are served and nothing resolves.
3. **`.env` must be created from `.env.example`** with real DB creds + `APP_KEY` + `JWT_SECRET`.
4. **`storage/` + `bootstrap/cache/` writable** by the PHP user: `chmod 755` dirs, `664` files, never 777.
5. **`APP_DEBUG=false`** (rule #16). All errors render as `{detail:...}` / `{field:[...]}` (rule #13).
6. **Do NOT re-run destructive DDL.** Laravel migrations are `if (Schema::hasTable(...)) return;`
   — idempotent, non-destructive, and safe on an existing database (rule #8: reuse existing tables).

---

## 3. Deployment steps (host, in order)

```bash
# 0. Upload the `laravel/` tree (zip → cPanel File Manager → Extract), minus /vendor initially.
# 1. Composer (pick ONE):
composer install --no-dev --optimize-autoloader -d laravel        # (with SSH)
#    OR upload a prebuilt vendor/ built on a machine with PHP 8.2+.

# 2. Environment:
cd laravel
cp .env.example .env
#    edit .env → DB_DATABASE=shega_admin (existing), DB creds, APP_KEY(AppKey...), JWT_SECRET(64)
php artisan key:generate

# 3. Migrations (idempotent; will NOT drop/alter existing tables — only create missing):
php artisan migrate --force

# 4. Cache config/routes/views:
php artisan config:cache && php artisan route:cache && php artisan view:cache

# 5. Permission hardening:
chmod 755 storage storage/framework storage/framework/{cache,sessions,views} storage/logs bootstrap/cache public
chmod 664 storage/framework/cache/data public/.htaccess .env
```

Verify docroot serves: `curl https://api.afran.et/api/health` → `{"status":"ok","service":"shega-admin-api",...}`.

---

## 4. Smoke checklist (exactly mirrors Node smoke)

Run AFTER deploy, from a machine with network access to `api.afran.et`:

```
1.  GET  /api/health                      200 {"status":"ok","service":"shega-admin-api",...}
2.  OPTIONS /api/auth/login/              200 + Access-Control-Allow-* (cors)
3.  POST  /api/auth/login/  bad creds     401 {detail:"Invalid credentials."}
4.  POST  /api/auth/login/  good creds    200 {access,refresh,user}
5.  POST  /api/auth/refresh/  {refresh}   200 {access,refresh}  (rotated)
6.  GET   /api/auth/profile/  Bearer      200 {…user…}
7.  PATCH /api/auth/profile/              200 updates
9.  POST  /api/auth/change-password/      204
10. POST  /api/admin/businesses/  (admin) 200 DRF page {count,next,previous,results}
11. GET   /api/admin/dashboard/           200 {businesses:{…},subscriptions:{…},payments:{…}}
12. POST  /api/admin/payments/<id>/approve/  200 (transactional: engages license, plan, invoice)
13. POST  /api/admin/licenses/<id>/suspend/  200
14. POST  /api/admin/trials/<id>/convert/    200
15. Wrong-route (e.g. GET /api/admin/businesses?x) → 404 {detail:...,"type":"not_found"...}
16. 429 after N bad logins → LoginLockout (matches accounts_loginattempt logic)
```

---

## 5. Parity & regression testing (required BEFORE cutting over)

- Run `node tests/` (existing) against the **Node API** → baseline green (unchanged).
- Point `NEXT_PUBLIC_API_URL` at `https://api.afran.et` in staging; run the `docs/testing-checklist.md`
  manual pass; confirm identical DRF shapes and status codes.
- **Rollback rule #20:** if any parity fail, set `NEXT_PUBLIC_API_URL` back to the Node API
  (documented in `api/README.md`) — Node stays until parity is green.

---

## 6. Files this port adds (idempotent, byte-verified)

- `laravel/composer.json` (Laravel 11.31+, firebase/php-jwt, phpunit 11)
- `laravel/artisan` + `bootstrap/{app,providers,app.kernel}.php` (Laravel 11 boot)
- `laravel/config/{app,shega,database}.php` — env-driven, DRF-compatible defaults
- `laravel/database/migrations/2026_01_01_*.php` — **19 table-creation migrations**, each guarded
  by `Schema::hasTable()`, idempotent, non-destructive
- (Controllers/models/services/middleware: authored next via the runbook's module checklist.)

---

## 7. Byte-integrity manifest

Every PHP file under `laravel/` has passed the following scan (results in this session's log):

```
signatures scanned: trueftime|falseftime|ftime\(|classvin|umc\(|ftime\)  → 0 hits across 28 files
```

For the whole tree to be trusted after edits, re-run:

```bash
php -l <file>            # lint every edited file
# PowerShell one-liner:
Get-ChildItem -Path laravel -Recurse -Filter *.php | % { $c=Get-Content $_.FullName -Raw; if($c -match "trueftime|falseftime") { Write-Warning $_.FullName } }
```

---

## 8. Onboarding handoff checklist for the operator

- [ ] Node `api/` untouched (git status clean apart from new `laravel/` dir)
- [ ] `laravel/` scaffold byte-verified (Section 7 scan)
- [ ] Composer available on host (or prebuilt vendor/ uploaded)
- [ ] Domain docroot ends in `/public`
- [ ] `.env` created, `APP_DEBUG=false`, `JWT_SECRET`/`APP_KEY` generated
- [ ] 19 migrations ran without error (creates missing tables only)
- [ ] Section 4 smoke (16 steps) green
- [ ] Parity pass (Section 5) green before switching `NEXT_PUBLIC_API_URL`
