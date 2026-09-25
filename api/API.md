# shega-admin-api — API reference

Admin-only backend. Every route below requires `Authorization: Bearer <access>`.
Content-Type is `application/json`. Lists are DRF-style:
`{ count, next, previous, results }`, pagination via `?page=` & `?page_size=`,
ordering via `?ordering=-created_at`, filtering via `?date_from=&date_to=`.
Trailing slashes are tolerated (`/api/admin/businesses/` == `/api/admin/businesses`).

## Auth (`/api/auth`)

| Method | Path                 | Description |
|--------|----------------------|-------------|
| POST   | `/login`             | `{username|email, password}` → `{access, refresh, user}`. Lockout after 5 fails/15min. |
| POST   | `/refresh`           | `{refresh}` → new `{access, refresh}` (rotation; old token revoked) |
| POST   | `/logout`            | `{refresh}` → 205; revokes token + closes active AdminSession |
| GET    | `/profile`           | current user (serialized `User`) |
| PATCH  | `/profile`           | update email/phone/business_name/business_type/address/notes/first/last name |
| POST   | `/change-password`   | `{old_password, new_password}` |
| POST   | `/password-reset`    | `{email}` → fires reset email (dev returns `reset_data` to allow manual reset) |
| POST   | `/password-reset/confirm` | `{uid, token, password, password2}` |

## Businesses (`/api/admin/businesses`)

| Method | Path                     | Description |
|--------|--------------------------|-------------|
| GET    | `/`                      | list (search: email/phone/business_name/username/first/last; filters: `is_active`, `business_type`, `email_verified`, date range; ordering) |
| POST   | `/`                      | create customer (email, username, password/business_name/phone/business_type…) |
| GET    | `/:id/`                  | detail (customer_profile, licenses, recent_payments) |
| PATCH  | `/:id/`                  | update profile fields |
| DELETE | `/:id/`                  | hard delete |
| POST   | `/:id/delete/`           | same as DELETE (frontend uses this path) |
| POST   | `/:id/suspend/`          | `{reason}` → deactivate user |
| POST   | `/:id/activate/`         | reactivate |
| POST   | `/:id/reset-trial/`      | superuser only; restarts trail |
| GET    | `/:id/subscription_history/` | past licenses for that customer |
| GET    | `/:id/payment_history/`  | customer payments |

## Subscriptions (`/api/admin/subscriptions`)

| Method | Path                 | Description |
|--------|----------------------|-------------|
| GET    | `/`                  | list (search: customer fields / license key; filters: `status`, `plan`, `is_trial`, dates; ordering) |
| GET    | `/:id/`              | detail incl. license, plan, payments, audit_logs, device_activations |
| POST   | `/:id/activate/`     | set status active |
| POST   | `/:id/extend/`       | `{days}` — extend expiry (reactivates expired) |
| POST   | `/:id/renew/`        | restart from now for plan duration; audits |
| POST   | `/:id/upgrade/`      | `{plan_id}` (higher price required) |
| POST   | `/:id/downgrade/`    | `{plan_id}` (lower price required) |
| POST   | `/:id/cancel/`       | `{reason?}` → status revoked |
| POST   | `/:id/expire/`       | force expire now |
| POST   | `/:id/restore/`      | reactivate a revoked/expired license |
| POST   | `/:id/notes/`        | `{notes}` |

## Payments (`/api/admin/payments`)

| Method | Path                 | Description |
|--------|----------------------|-------------|
| GET    | `/`                  | list (search: customer/`transaction_id`; filters: `status`, `payment_method`, dates; ordering) |
| GET    | `/:id/`              | detail incl. customer, plan, license, invoice |
| POST   | `/:id/approve/`      | `{admin_notes?}` → approves, processes license (renew or create), creates Invoice, notifies customer **transactionally** |
| POST   | `/:id/reject/`       | `{reason}` → notifies customer |
| POST   | `/:id/request_info/` | `{message}` → notify customer |
| GET    | `/search`            | `?q=` → `{results:[…]}` (max 50) |

Approval mirrors legacy `process_approved_payment`: if the payment references a
license, expiry = `max(expiry, today) + plan.duration_months*30` (and status
reactivated); otherwise it creates a new active license (skipped if the customer
already holds an active license for that plan) and a `INV-YYYYMMDD-XXXX` invoice.

## Trials (`/api/admin/trials`)

| Method | Path              | Description |
|--------|-------------------|-------------|
| GET    | `/`               | list (`is_trial=true`); filters `status`, search, dates |
| GET    | `/:id/`           | detail |
| POST   | `/:id/extend/`    | `{days}` |
| POST   | `/:id/end/`       | expire now |
| POST   | `/:id/convert/`   | `{plan_id}` → converts to paid plan |
| POST   | `/:id/reset/`     | superuser only; 30-day trial restart |

## Plans (`/api/licenses/plans`)

The canonical plan structure is three editions:

| Plan | Edition | Price | Mobile | Desktop | Businesses |
|------|---------|-------|--------|---------|------------|
| Mobile | `mobile` | 4,500 ETB/mo | 1 | 0 | 1 |
| Desktop | `desktop` | 7,500 ETB/mo | 0 | 1 | 1 |
| Mobile + Desktop | `both` | 10,000 ETB/mo | 1 | 1 | 1 |

| Method | Path        | Description |
|--------|-------------|-------------|
| GET    | `/`         | list (search name, filter `is_active`, dating, ordering price/duration_months/created_at) |
| POST   | `/`         | create `{name, duration_months, device_limit, price, is_active, edition?, included_mobile_devices?, included_desktop_devices?, included_businesses?, addon_*_price?}` |
| GET    | `/:id/`     | detail |
| PATCH  | `/:id/`     | update (partial — any field above) |
| DELETE | `/:id/`     | delete (400 if referenced by licenses) |

Public (no auth): `GET /api/plans` → active plans, ordered by price.

Legacy `Basic*` / `Premium*` rows are folded into the editions above with
`npm run migrate:plans` (add `DRY_RUN=1` to preview).

## Licenses & devices (`/api/licenses`)

| Method | Path                        | Description |
|--------|-----------------------------|-------------|
| GET    | `/device-activations`       | list (filter `license`, `is_active`, `operating_system`; search device/device_name/license key; ordering) |
| POST   | `/licenses/:id/suspend`     | suspend active license |
| POST   | `/licenses/:id/deactivate_device` | `{device_id}` — revoke an activation |

## Settings (`/api/admin/settings`)

| Method | Path    | Description |
|--------|---------|-------------|
| GET    | `/`     | `{settings:[{key, value, type, description?}]}` |
| PUT    | `/`     | upsert by key from array `[{key, value, type}]` |

## App versions (`/api/admin/app-versions`)

| Method | Path              | Description |
|--------|-------------------|-------------|
| GET    | `/`               | list (filter `platform`, `is_force_update`; search) |
| POST   | `/`               | create `{platform: android|ios|windows|web, version, min_version?, is_force_update?, release_notes?, download_url?}` |
| GET    | `/:id/`           | detail |
| PATCH  | `/:id/`           | partial update |
| POST   | `/:id/notify`     | notify all customers of the update |
| DELETE | `/:id/`           | delete |

## Dashboard (`/api/admin/dashboard`)

`GET /` → metrics matching the frontend `DashboardMetrics`:
`totalBusinesses, activeBusinesses, trialUsers, pendingPayments,
activeSubscriptions, expiredSubscriptions, mobileSubscribers, desktopSubscribers,
bothSubscribers, monthlyRevenue, todayRevenue, renewalsThisMonth,
newBusinessesToday, revenueTrend, subscriptionGrowth, trialConversionRate,
mobileVsDesktop, subscriptionDistribution, expiringSoon, recentActivity`.
`subscriptionDistribution` is `{ mobile, desktop, both }` — the canonical plan
editions. Time buckets use Ethiopia (UTC+3) like the legacy `TIME_ZONE`.

## Audit logs (`/api/admin/audit-logs`)

| Method | Path    | Description |
|--------|---------|-------------|
| GET    | `/`     | list (filter `action`, `resource_type`, `admin`; search; ordering by created_at) |
| GET    | `/:id/` | detail |

## Admins (`/api/admin/admins`)

| Method | Path     | Description |
|--------|----------|-------------|
| GET    | `/`      | list (`is_active`, `is_superuser` filters; search) |
| POST   | `/`      | create `{username, email, password, password2, phone?, first_name?, last_name?, is_admin?, is_superuser?}` |
| GET    | `/:id/`  | detail |
| PATCH  | `/:id/`  | update `{email?, phone?, first_name?, last_name?, is_active?, is_admin?, is_superuser?}` |
| DELETE | `/:id/`  | delete (self-delete and super-admin deletion blocked) |

## Errors

- `400 {detail}` or `{field: ["message"]}` — validation
- `401 {detail}` — missing/invalid credentials
- `403 {detail}` — admin access required
- `404 {detail}` — not found
- `429 {detail}` — lockout / rate limit
- `204` — successful delete

## Client (Mobile / Desktop) endpoints

These are the endpoints Shega Mobile and Shega Desktop call, so all three apps
share one account, one subscription and one business id:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | create account |
| POST | `/api/auth/login` | `{username\|email, password}` → tokens |
| POST | `/api/auth/refresh` | rotate tokens |
| POST | `/api/auth/logout` | revoke refresh token |
| GET | `/api/auth/profile` | current account |
| GET | `/api/auth/memberships` | businesses this account may operate |
| GET | `/api/plans` | active plans (Mobile / Desktop / Mobile + Desktop) |
| POST | `/api/subscription/trial` | `{plan_id}` → start 7-day trial |
| GET | `/api/subscription/status` | canonical subscription status |
| POST | `/api/payments/create` | submit a payment `{plan_id, transaction_id, payment_type?}` |
| GET | `/api/payments/my-payment` | latest payment |
| GET | `/api/license/status` · POST `/api/license/verify` | license + device activation |
| GET | `/api/customers/dashboard` · `/licenses` · `/payments` · `/invoices` · `/notifications` | customer portal |
- Device sync / mobile flow: `/api/license/*` (validate/activate/heartbeat),
  `/api/sync/*`, `/api/mor/*`, `/api/github/release/*`
- Admin extras: `/api/admin/revenue/*`, `/api/admin/analytics/*`,
  `/api/admin/reports/*`, `/api/admin/notifications/*`, `/api/admin/feature-flags/*`,
  `/api/admin/support-tickets/*`

The **admin pages that still call dropped routes** before this migration:
`/customer/*`, `/pricing`, `/download`, `/auth/register`. Those pages (and any
mobile apps relying on `/api/license/*`) are out of scope and will not work
against this API.