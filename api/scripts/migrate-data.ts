/**
 * One-time data migration: legacy Django PostgreSQL database → new MySQL database.
 *
 * Requires two env vars (see api/.env.example):
 *   - DATABASE_URL          the NEW MySQL target (Prisma points at this already)
 *   - LEGACY_DATABASE_URL   the OLD PostgreSQL source
 *
 * Run: npx tsx scripts/migrate-data.ts
 */
import "dotenv/config";
import { Client } from "pg";
import { PrismaClient } from "@prisma/client";

const srcUrl = process.env.LEGACY_DATABASE_URL;
if (!srcUrl) {
  console.error("Missing LEGACY_DATABASE_URL (PostgreSQL source).");
  process.exit(1);
}

interface TableSpec {
  table: string;
  model: string;
  /** Prisma model field names — identical to the legacy PostgreSQL column names. */
  columns: string[];
}

const SPECS: TableSpec[] = [
  {
    table: "accounts_user",
    model: "user",
    columns: [
      "id", "password", "last_login", "is_superuser", "username", "first_name",
      "last_name", "email", "is_staff", "is_active", "date_joined", "phone",
      "business_name", "business_type", "address", "is_customer", "is_admin",
      "email_verified", "phone_verified", "created_at", "updated_at", "notes",
    ],
  },
  {
    table: "customers_customerprofile",
    model: "customerProfile",
    columns: [
      "id", "user_id", "company_name", "tin_number", "city", "region", "country",
      "website", "status", "notes", "created_at", "updated_at",
    ],
  },
  {
    table: "licenses_licenseplan",
    model: "plan",
    columns: ["id", "name", "duration_months", "device_limit", "price", "is_active", "created_at"],
  },
  {
    table: "licenses_license",
    model: "license",
    columns: [
      "id", "license_key", "customer_id", "plan_id", "status", "start_date",
      "expiry_date", "device_limit", "notes", "is_trial", "created_at", "updated_at",
    ],
  },
  {
    table: "licenses_deviceactivation",
    model: "deviceActivation",
    columns: [
      "id", "license_id", "device_id", "device_name", "activation_date",
      "last_seen", "ip_address", "operating_system", "is_active",
    ],
  },
  {
    table: "licenses_licenseauditlog",
    model: "licenseAuditLog",
    columns: ["id", "license_id", "action", "details", "ip_address", "created_by_id", "created_at"],
  },
  {
    table: "payments_payment",
    model: "payment",
    columns: [
      "id", "customer_id", "license_id", "plan_id", "amount", "transaction_id",
      "receipt_image", "payment_method", "status", "admin_notes", "reviewed_by_id",
      "reviewed_at", "created_at", "updated_at",
    ],
  },
  {
    table: "payments_invoice",
    model: "invoice",
    columns: [
      "id", "invoice_number", "customer_id", "payment_id", "license_id",
      "amount", "status", "due_date", "paid_at", "created_at",
    ],
  },
  {
    table: "notifications_notification",
    model: "notification",
    columns: ["id", "recipient_id", "notification_type", "title", "message", "is_read", "link", "created_at"],
  },
  {
    table: "admin_api_systemsetting",
    model: "systemSetting",
    columns: ["id", "key", "value", "type", "description", "created_at", "updated_at"],
  },
  {
    table: "admin_api_featureflag",
    model: "featureFlag",
    columns: ["id", "name", "code", "enabled", "is_beta", "description", "created_at", "updated_at"],
  },
  {
    table: "admin_api_appversion",
    model: "appVersion",
    columns: ["id", "platform", "version", "min_version", "is_force_update", "release_notes", "download_url", "created_at"],
  },
  {
    table: "admin_api_supportticket",
    model: "supportTicket",
    columns: [
      "id", "business_id", "subject", "description", "priority", "status",
      "assigned_to_id", "platform", "created_at", "updated_at",
    ],
  },
  {
    table: "admin_api_supportreply",
    model: "supportReply",
    columns: ["id", "ticket_id", "admin_id", "message", "is_internal", "created_at"],
  },
  {
    table: "admin_api_auditlog",
    model: "auditLog",
    columns: [
      "id", "admin_id", "action", "resource_type", "resource_id", "details",
      "before_state", "after_state", "ip_address", "user_agent", "created_at",
    ],
  },
  {
    table: "admin_api_adminsession",
    model: "adminSession",
    columns: ["id", "admin_id", "ip_address", "user_agent", "login_time", "logout_time", "is_active"],
  },
  {
    table: "accounts_businessmembership",
    model: "businessMembership",
    columns: ["id", "user_id", "business_id", "status", "role", "permissions", "is_active", "invited_by_id", "created_at", "updated_at"],
  },
  {
    table: "accounts_loginattempt",
    model: "loginAttempt",
    columns: ["id", "identifier", "ip_address", "user_id", "success", "outcome", "user_agent", "timestamp"],
  },
];

/** JSON-ish Postgres values must be stringified before going into LONGTEXT. */
function coerce(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (Buffer.isBuffer(value)) return value.toString();
  const t = typeof value;
  if (t === "object") return JSON.stringify(value);
  if (t === "bigint") return Number(value);
  if (t === "number") return value;
  if (t === "boolean") return value;
  return String(value);
}

async function main(): Promise<void> {
  const src = new Client({ connectionString: srcUrl });
  await src.connect();
  const prisma = new PrismaClient();

  const totals: Record<string, number> = {};
  try {
    for (const spec of SPECS) {
      const result = await src.query(`SELECT ${spec.columns.map((c) => `"${c}"`).join(", ")} FROM "${spec.table}"`);
      const rows = result.rows;
      if (rows.length === 0) {
        console.log(`${spec.table.padEnd(32)} 0`);
        totals[spec.table] = 0;
        continue;
      }
      const model = (prisma as unknown as Record<string, { createMany: (args: unknown) => Promise<unknown> }>)[
        spec.model
      ];
      if (!model) {
        throw new Error(`Unknown Prisma model: ${spec.model}`);
      }
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500).map((row) => {
          const data: Record<string, unknown> = {};
          for (const col of spec.columns) {
            if (col in row) data[col] = coerce(row[col]);
          }
          return data;
        });
        await model.createMany({
          data: chunk,
          skipDuplicates: true,
        });
      }
      console.log(`${spec.table.padEnd(32)} ${rows.length}`);
      totals[spec.table] = rows.length;
    }
  } finally {
    await src.end();
    await prisma.$disconnect();
  }

  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);
  console.log("─".repeat(44));
  console.log(`TOTAL ROWS MIGRATED: ${grandTotal}`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});