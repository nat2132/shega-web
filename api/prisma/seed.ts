import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function requirePassword(): string {
  const pw = process.env.SEED_ADMIN_PASSWORD;
  if (pw && pw.length >= 12) return pw;
  if (!pw) {
    console.error(
      "SEED_ADMIN_PASSWORD is required (set it in the environment to a strong value of at least 12 characters).",
    );
  } else {
    console.error(
      `SEED_ADMIN_PASSWORD is too short (${pw.length} chars). Use at least 12 characters.`,
    );
  }
  process.exit(1);
  return ""; // unreachable
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@shega.com";
  const username = process.env.SEED_ADMIN_USERNAME || "admin";
  const password = requirePassword();
  const now = new Date();

  const adminUser = await prisma.user.findUnique({ where: { username } });
  if (!adminUser) {
    const hash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        username,
        email,
        password: hash,
        first_name: "Shega",
        last_name: "Admin",
        address: "",
        notes: "",
        is_staff: true,
        is_superuser: true,
        is_admin: true,
        is_active: true,
        is_customer: false,
        date_joined: now,
        created_at: now,
        updated_at: now,
      },
    });
    console.log(`Created admin user "${username}" <${email}>.`);
  } else {
    console.log(`Admin "${username}" already exists, skipping.`);
  }

  const plans = [
    {
      name: "Mobile",
      edition: "mobile",
      duration_months: 1,
      device_limit: 1,
      price: 4500,
      included_mobile_devices: 1,
      included_desktop_devices: 0,
      included_businesses: 1,
    },
    {
      name: "Desktop",
      edition: "desktop",
      duration_months: 1,
      device_limit: 1,
      price: 7500,
      included_mobile_devices: 0,
      included_desktop_devices: 1,
      included_businesses: 1,
    },
    {
      name: "Mobile + Desktop",
      edition: "both",
      duration_months: 1,
      device_limit: 1,
      price: 10000,
      included_mobile_devices: 1,
      included_desktop_devices: 1,
      included_businesses: 1,
    },
  ];

  for (const p of plans) {
    const existing = await prisma.plan.findFirst({ where: { name: p.name } });
    if (existing) continue;
    await prisma.plan.create({ data: { ...p, is_active: true, created_at: now } });
    console.log(`Created plan "${p.name}" @ ETB ${p.price}/month.`);
  }
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
