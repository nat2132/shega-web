# Shega Admin — API → Laravel Migration Plan (Node/Express/Prisma → Laravel/Eloquent)

This is the step-1 research deliverable: an explicit mapping of the **existing**
Node.js admin API (fully built in `api/`, verified, builds clean) onto a
Laravel/PHP implementation, so nothing is re-imagined and the frontend keeps
working. It is the contract the Laravel build will follow.

Status: **DRAFT — awaiting 3 answers at the bottom before code generation.**

---

## 0. Environment / toolchain findings (recon, run now)

| Runtime | Installed locally? | Notes |
|---------|--------------------|-------|
| Node.js | ✅ v24 | API builds, typechecks, boots (`/health` 200) |
| PHP | ❌ | **Not on this machine** — cannot `composer install`, `php artisan`, or locally verify the Laravel app |
| Composer | ❌ | Not installed here |
| mysql client / docker | ❌ | No local MySQL, no Docker, no mysql CLI |
| Plesk MySQL `10.180.50.142:3306` | unreachable | ICMP/TCP to that 10.x private host fails from here; DB ops must run on the server side |
| Legacy PostgreSQL | not configured | `LEGACY_DATABASE_URL` deliberately left unset; data migration blocked |

**Consequence:** the Laravel source can be authored here, but verification
(`composer install`, `migrate`, `/api/health`, login smoke test) needs a machine
that has PHP 8.2+ and Composer and, for live tests, network access to the MySQL
target. That is the same constraint as the Node port — nothing new.

---

## 1. Route mapping (Node router → Laravel controller/route)

All live behind `https://<api-host>/api`. Laravel mounts a single group in
`routes/api.php` with prefix `/api`, preserving DRF trailing-slash tolerance via
a small middleware that strips a trailing `/` before routing.

### Auth → `App\Http\Controllers\Auth*Controller` (routes under `/auth`)

| Method | Path | Express handler | Laravel controller@method |
|--------|------|-----------------|---------------------------|
| POST | `/login` | `authRouter.post("/login")` | `AuthController@login` |
| POST | `/refresh` | `authRouter.post("/refresh")` | `AuthController@refresh` |
| POST | `/logout` | `authRouter.post("/logout")` | `AuthController@logout` |
| GET | `/profile` | `authRouter.get("/profile")` | `AuthController@profile` |
| PATCH | `/profile` | `authRouter.patch("/profile")` | `AuthController@updateProfile` |
| POST | `/change-password` | `authRouter.post("/change-password")` | `AuthController@changePassword` |
| POST | `/password-reset` | `authRouter.post("/password-reset")` | `AuthController@passwordReset` |
| POST | `/password-reset/confirm` | `authRouter.post("/password-reset/confirm")` | `AuthController@passwordResetConfirm` |

### Businesses → `BusinessController` (under `/businesses`)

| Method | Path | Express handler | Laravel |
|--------|------|-----------------|---------|
| GET | `/` | list (search, filters, ordering, pagination) | `BusinessController@index` |
| POST | `/` | create | `BusinessController@store` |
| GET | `/:id/` | detail (profile, licenses, payments) | `BusinessController@show` |
| PATCH | `/:id/` | update | `BusinessController@update` |
| DELETE | `/:id/` | delete | `BusinessController@destroy` |
| POST | `/:id/delete/` | DRF `action` destroy | `BusinessController@softDestroy` |
| POST | `/:id/suspend/` | suspend | `BusinessController@suspend` |
| POST | `/:id/activate/` | activate | `BusinessController@activate` |
| POST | `/:id/reset-trial/` | reset trial (superuser) | `BusinessController@resetTrial` |
| GET | `/:id/subscription_history/` | list | `BusinessController@subscriptionHistory` |
| GET | `/:id/payment_history/` | list | `BusinessController@paymentHistory` |
| GET | `/search/` | search | `BusinessController@search` |

### Plans → `PlanController` (under `/plans`)

| Method | Path | Laravel |
|--------|------|---------|
| GET | `/` | `PlanController@index` |
| POST | `/` | `PlanController@store` |
| GET/PATCH/DELETE | `/:id/` | `PlanController@show/update/destroy` |

### Subscriptions → `SubscriptionController` (under `/subscriptions`)

| Method | Path | Laravel |
|--------|------|---------|
| GET | `/` | `SubscriptionController@index` |
| GET | `/:id/` | `SubscriptionController@show` |
| POST | `/:id/activate/` | `SubscriptionController@activate` |
| POST | `/:id/extend/` | `SubscriptionController@extend` |
| POST | `/:id/renew/` | `SubscriptionController@renew` |
| POST | `/:id/upgrade/` | `SubscriptionController@upgrade` |
| POST | `/:id/downgrade/` | `SubscriptionController@downgrade` |
| POST | `/:id/cancel/` | `SubscriptionController@cancel` |
| POST | `/:id/expire/` | `SubscriptionController@expire` |
| POST | `/:id/restore/` | `SubscriptionController@restore` |
| PATCH | `/:id/notes/` | `SubscriptionController@updateNotes` |

### Payments → `PaymentController` (under `/payments`)

| Method | Path | Laravel |
|--------|------|---------|
| GET | `/` | `PaymentController@index` |
| GET | `/:id/` | `PaymentController@show` |
| POST | `/:id/approve/` | `PaymentController@approve` (transactional license renewal/creation + invoice + notify) |
| POST | `/:id/reject/` | `PaymentController@reject` |
| POST | `/:id/request_info/` | `PaymentController@requestInfo` |
| GET | `/search/` | `PaymentController@search` |

### Trials → `TrialController` (under `/trials`)

| Method | Path | Laravel |
|--------|------|---------|
| GET | `/` | `TrialController@index` (is_trial=true + filters) |
| GET | `/:id/` | `TrialController@show` |
| POST | `/:id/extend/` | `TrialController@extend` |
| POST | `/:id/end/` | `TrialController@end` |
| POST | `/:id/convert/` | `TrialController@convert` |
| POST | `/:id/reset/` | `TrialController@reset` |

### Licenses / device activations → `LicenseController` (under `/licenses`)

| Method | Path | Laravel |
|--------|------|---------|
| GET | `/device-activations/` | `LicenseController@deviceActivations` |
| POST | `/licenses/:id/suspend/` | `LicenseController@suspend` |
| POST | `/licenses/:id/deactivate_device/` | `LicenseController@deactivateDevice` |
| GET | `/licenses/:id/payments/` | `LicenseController@licensePayments` |
| GET | `/licenses/:id/auditlogs/` | `LicenseController@licenseAuditLogs` |

### Settings → `SettingController` (under `/settings`)

| Method | Path | Laravel |
|--------|------|---------|
| GET | `/` | `SettingController@index` (`{settings:[...]}`) |
| PUT | `/` | `SettingController@update` (upsert by key) |

### App versions → `AppVersionController` (under `/app-versions`)

| Method | Path | Laravel |
|--------|------|---------|
| GET | `/` | `AppVersionController@index` |
| POST | `/` | `AppVersionController@store` |
| GET/PATCH/DELETE | `/:id/` | `AppVersionController@show/update/destroy` |
| POST | `/:id/notify/` | `AppVersionController@notify` |

### Dashboard → `DashboardController` (under `/dashboard`)

| Method | Path | Laravel |
|--------|------|---------|
| GET | `/` | `DashboardController@index` (full metrics, trend SQL) |

### Audit logs → `AuditLogController` (under `/audit-logs`)

| Method | Path | Laravel |
|--------|------|---------|
| GET | `/` | `AuditLogController@index` |
| GET | `/:id/` | `AuditLogController@show` |

### Admin users → `AdminUserController` (under `/admins`)

| Method | Path | Laravel |
|--------|------|---------|
| GET | `/` | `AdminUserController@index` |
| POST | `/` | `AdminUserController@store` |
| GET/PATCH/DELETE | `/:id/` | `AdminUserController@show/update/destroy` |

---

## 2. Database mapping (Prisma model → Eloquent model → MySQL table)

The database is **unchanged** on disk (Django/MySQL tables). Laravel reuses it with
`$table` set to the legacy name — no `Schema::dropIfExists`, no destructive ops.

| Prisma model | Laravel model (`App\Models`) | MySQL table (Django name) |
|--------------|-----------------------------|---------------------------|
| `User` | `User` | `accounts_user` |
| `BusinessMembership` | `BusinessMembership` | `accounts_businessmembership` |
| `LoginAttempt` | `LoginAttempt` | `accounts_loginattempt` |
| `CustomerProfile` | `CustomerProfile` | `customers_customerprofile` |
| `Plan` | `Plan` | `licenses_licenseplan` |
| `License` | `License` | `licenses_license` |
| `DeviceActivation` | `DeviceActivation` | `licenses_deviceactivation` |
| `LicenseAuditLog` | `LicenseAuditLog` | `licenses_licenseauditlog` |
| `Payment` | `Payment` | `payments_payment` |
| `Invoice` | `Invoice` | `payments_invoice` |
| `Notification` | `Notification` | `notifications_notification` |
| `RefreshToken` | `RefreshToken` (new) | `auth_refreshtoken` |
| `SystemSetting` | `SystemSetting` | `admin_api_systemsetting` |
| `FeatureFlag` | `FeatureFlag` | `admin_api_featureflag` |
| `AppVersion` | `AppVersion` | `admin_api_appversion` |
| `SupportTicket` | `SupportTicket` | `admin_api_supportticket` |
| `SupportReply` | `SupportReply` | `admin_api_supportreply` |
| `AuditLog` | `AuditLog` | `admin_api_auditlog` |
| `AdminSession` | `AdminSession` | `admin_api_adminsession` |

### Type translation (Django → MySQL → Eloquent cast)

| Django type | MySQL column | Problem in Laravel/Eloquent |
|-------------|--------------|------------------------------|
| JSONField | `LONGTEXT` | Stored JSON; must decode in the model (accessor) or a global cast — mirrors Prisma `parseJsonObject` |
| DateTime(0) | `DATETIME(0)` | `toRfc3339String()` iso output via a `DRF` cast/accessor |
| DateField | `DATE` (`expiry_date` nullable) | Eloquent `date` cast; nullable handled |
| Decimal(10,2) | `DECIMAL(10,2)` | Eloquent `decimal:2` cast; must output as **number** like DRF |
| Boolean | `TINYINT(1)` | Eloquent `boolean` cast |
| ids | `INT` (int4) | Eloquent int (matches Django int fields; 2^31-1 cap preserved) |

---

## 3. Auth behavior (must match, not just "work")

The current Node API (mirroring DRF) returns on login:

```json
{ "access": "…", "refresh": "…", "user": { "id": 1, "username": "admin", … } }
```

Laravel must preserve this exact shape and mechanics:

- **Access token** (1h) / **refresh token** (30d), HS256 JWT with `jti` claim,
  signed with `JWT_SECRET`. Use `firebase/php-jwt` (pure PHP, no crypto pitfalls).
- **Refresh rotation**: refresh token stored hashed in `auth_refreshtoken`
  (`jti`, `token_hash` SHA-256, `expires_at`, `revoked_at`, `replaced_by_jti`,
  `ip_address`, `user_agent`); every refresh revokes the old and issues a new
  pair (`{access, refresh}`), exactly like the Node rotation.
- **Password verification order**: legacy Django
  `pbkdf2_sha256$<iters>$<salt>$<hash>` → verify with `hash_pbkdf2` and
  `hash_equals`; otherwise bcrypt via Laravel's `Illuminate\Hashing\BcryptHasher`
  (new/changed passwords hashed with bcrypt, cost 12, matching the Node port).
- **Login lockout**: ≥5 failed attempts per identifier within 15 min → `429`
  (query `accounts_loginattempt` for `success=false` within the window).
- **Admin filter**: login only for `is_active` users; every protected route
  checks `is_staff || is_admin || is_superuser` (admin middleware → `403`).
- **Logout**: revoke the refresh token + close open `AdminSession` → `205`.

---

## 4. Response-shape guarantees (DRF compatibility)

- Errors → `{ "detail": "…" }` or `{ "<field>": ["…"] }`
- Lists → `{ count, next, previous, results }` (Laravel paginator adapted)
- Ordering → `ordering=` param; filters/date ranges (see existing `FilterSet`)
- Search → `search=` across the same field lists
- Values: dates as RFC3339 `YYYY-MM-DDThh:mm:ss`, amounts as numbers, trailing
  `/` tolerated.

---

## 5. Packages / dependencies (composer.json)

```json
{
  "require": {
    "php": "^8.2",
    "laravel/framework": "^11.0",
    "firebase/php-jwt": "^6.10"
  }
}
```

No Sanctum/Socialite/Passport — the contract is custom JWT, kept dependency-light
for shared hosting.

---

## 6. What is NOT carried over (documented drop, same as Node port)

- Customer/portal API (`/api/customers/*`, `/api/notifications/*`,
  `/api/payments/create`, `/api/github/*`, `/api/license/*`, `/api/sync/*`,
  `/api/mor/*`)
- Revenue/analytics/reports/admin-notifications/feature-flags/support-tickets
  admin endpoints
- These legacy pages in the Next.js frontend (`/customer/*`, `/pricing`,
  `/download`, `/auth/register`) are out of scope.

---

## 7. Blocking questions (answers determine where code goes & how it's verified)

1. **Hosting target**: Is the final deploy **Ethio Telecom shared hosting (cPanel,
   PHP + MySQL, no Node)** — i.e., Laravel at `api.afran.et` with `public/` docroot,
   as sections 21-22 state? Or is it the **Plesk server** (`api.afran.et`/`10.180.50.142`)
   I was deploying the Node API to? The docs and route/DB configs differ by target.
2. **Where does the Laravel project live**: a new `laravel/` (or `backend-laravel/`) dir,
   keeping the existing verified Node `api/` untouched (per section 20)?
3. **MySQL for the target**: host + DB name + user, so I can write exact
   `.env`/connection docs (won't be reachable live from here — same as before).
4. **Verification machine**: where PHP 8.2 + Composer will run so
   `composer install && php artisan migrate && php artisan serve` + smoke tests happen
   (you, on the host, or here after PHP is installed)?