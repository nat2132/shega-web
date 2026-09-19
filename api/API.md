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

| Method | Path        | Description |
|--------|-------------|-------------|
| GET    | `/`         | list (search name, filter `is_active`, dating, ordering price/duration_months/created_at) |
| POST   | `/`         | create `{name, duration_months, device_limit, price, is_active}` |
| GET    | `/:id/`     | detail |
| PATCH  | `/:id/`     | update (partial) |
| DELETE | `/:id/`     | delete (400 if referenced by licenses) |

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
activeSubscriptions, expiredSubscriptions, basicSubscribers, premiumSubscribers,
monthlyRevenue, todayRevenue, renewalsThisMonth, newBusinessesToday,
revenueTrend, subscriptionGrowth, trialConversionRate, mobileVsDesktop,
subscriptionDistribution, expiringSoon, recentActivity`. Time buckets use
Ethiopia (UTC+3) like the legacy `TIME_ZONE`.

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

## Dropped endpoints (not implemented)

The following legacy endpoints are **intentionally not** re-implemented; the
admin panel does not call them:

- Customer portal: `/api/customers/*`, `/api/notifications/*`,
  `/api/payments/create`, `/api/payments/my-payment`, `/api/plans/`,
  `/api/subscription/status/`
- Device sync / mobile flow: `/api/license/*` (validate/activate/heartbeat),
  `/api/sync/*`, `/api/mor/*`, `/api/github/release/*`
- Admin extras: `/api/admin/revenue/*`, `/api/admin/analytics/*`,
  `/api/admin/reports/*`, `/api/admin/notifications/*`, `/api/admin/feature-flags/*`,
  `/api/admin/support-tickets/*`

The **admin pages that still call dropped routes** before this migration:
`/customer/*`, `/pricing`, `/download`, `/auth/register`. Those pages (and any
mobile apps relying on `/api/license/*`) are out of scope and will not work
against this API.