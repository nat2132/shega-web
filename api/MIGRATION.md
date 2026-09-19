# Migrating SHEGA data: PostgreSQL (Django) → MySQL 8.0

The new Node.js backend (`api/`) reads from MySQL. The one-time migration copies
all rows from the legacy Django **PostgreSQL** database into the new **MySQL**
database. The new Prisma schema was intentionally written so that table and
column names exactly match the legacy Django tables, so the copy is direct.

## Plugin / runbook

```bash
# 1. Create the MySQL database + credentials, then set connection strings:
#    api/.env  (the NEW MySQL target) e.g.
#      DATABASE_URL="mysql://shega:password@127.0.0.1:3306/shega?connection_limit=5"
#      LEGACY_DATABASE_URL="postgres://shega:password@127.0.0.1:5432/shega"

# 2. Create the schema in MySQL from the Prisma schema (against a fresh DB):
npm run prisma:migrate      # dev only
# or on the server:
npx prisma migrate deploy

# 3. Remove the "admin" seed, then run the copy:
npm run migrate:data        # actually: npx tsx scripts/migrate-data.ts

# 4. Re-create the admin/original superuser account and set a password:
npx prisma db seed          # creates admin@shega.et / uses your provided password
# (or log in via the reset flow / Django PBKDF2 hash is NOT migratable —
#  passwords are copied as-is; bcrypt + Django PBKDF2_sha256 are both verified at login)
```

## Table mapping

| Legacy PostgreSQL table           | Prisma model            | Notes |
|-----------------------------------|-------------------------|-------|
| `accounts_user`                   | `User` (`@@map`)        | `is_staff` forced via flags; extra legacy columns dropped |
| `accounts_businessmembership`     | `BusinessMembership`    | data preserved, no admin endpoint |
| `accounts_loginattempt`           | `LoginAttempt`          | reused by the new login-lockout logic |
| `customers_customerprofile`       | `CustomerProfile`       | |
| `licenses_licenseplan`            | `Plan`                  | |
| `licenses_license`                | `License`               | `expiry_date` nullable (fix commit 2917403) |
| `licenses_deviceactivation`       | `DeviceActivation`      | |
| `licenses_licenseauditlog`        | `LicenseAuditLog`       | |
| `payments_payment`                | `Payment`               | |
| `payments_invoice`                | `Invoice`               | data preserved, no admin endpoint (auto-created on approval) |
| `notifications_notification`      | `Notification`          | created by approve/reject flows from now on |
| `admin_api_systemsetting`         | `SystemSetting`         | |
| `admin_api_featureflag`           | `FeatureFlag`           | data preserved, no admin endpoint |
| `admin_api_appversion`            | `AppVersion`            | |
| `admin_api_supportticket`         | `SupportTicket`         | data preserved, no admin endpoint |
| `admin_api_supportreply`          | `SupportReply`          | data preserved, no admin endpoint |
| `admin_api_auditlog`              | `AuditLog`              | |
| `admin_api_adminsession`          | `AdminSession`          | |
| — (new)                           | `RefreshToken`          | created at runtime by the refresh-rotation flow |

### Type conversions

- **JSONField** (Django stores JSON in `longtext` on MySQL): JSON-encoded into
  `LONGTEXT` columns (`BusinessMembership.permissions`, `LicenseAuditLog.details`,
  `AuditLog.details/before_state/after_state`). The application parses them with
  `parseJsonObject`.
- **DateTimeField(0)** → MySQL `DATETIME(0)`; the script round-trips ISO strings.
- **DateField** → MySQL `DATE`.
- **DecimalField(10,2)** → `DECIMAL(10,2)`; amounts come out of PostgreSQL as
  strings and are written back as strings (Prisma/MySQL keep exact precision).
- **BooleanField / NullBooleanField** → `TINYINT(1)`.
- **IntegerField ids** → `INT` (32-bit). The data must fit within `2^31 − 1`.
- Legacy columns that are **not** carried over (they exist on the old `accounts_user`
  table but have no backing in the new schema): `last_device_activation`,
  `last_device_id`, `last_sync_at`, `token_version`, `device_token`, `image`,
  `verification_code`, `password_reset_token`, `is_2fa_enabled`, `created_by_id`,
  `groups`, `user_permissions`. If your backend relies on any of these, they are
  drop-in losses and must be handled at the app layer instead.

### Resetting passwords during migration

Passwords (including SQLAlchemy-agnostic Django `pbkdf2_sha256` and any bcrypt
hashes) are copied as stored. `verifyPassword()` in `src/lib/password.ts`
handles both formats, so **existing admin logins keep working**. New/changed
passwords are hashed with bcrypt (12 rounds) by the app.