import { beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";

/**
 * Global DB bootstrap for the test suite. Runs before each test file.
 * Ensures the schema seed data (admin user + the three pricing plans) exists
 * so the suite never depends on the dev database's contents.
 */
async function seedBaseline(): Promise<void> {
  const now = new Date();
  const bcrypt = await import("bcryptjs");
  const admin = await prisma.user.findUnique({ where: { username: "admin" } });
  if (!admin) {
    const hash = await bcrypt.hash("TestAdmin-2026!", 12);
    await prisma.user.create({
      data: {
        username: "admin",
        email: "admin@shega.test",
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
  }

  const plans = [
    { name: "Mobile", edition: "mobile", duration_months: 1, device_limit: 1, price: 4500, included_mobile_devices: 1, included_desktop_devices: 0, included_businesses: 1 },
    { name: "Desktop", edition: "desktop", duration_months: 1, device_limit: 1, price: 7500, included_mobile_devices: 0, included_desktop_devices: 1, included_businesses: 1 },
    { name: "Mobile + Desktop", edition: "both", duration_months: 1, device_limit: 1, price: 10000, included_mobile_devices: 1, included_desktop_devices: 1, included_businesses: 1 },
  ];
  for (const p of plans) {
    const existing = await prisma.plan.findFirst({ where: { name: p.name } });
    if (!existing) {
      await prisma.plan.create({ data: { ...p, is_active: true, created_at: now } });
    }
  }

  await prisma.plan.updateMany({
    where: { name: { in: plans.map((p) => p.name) } },
    data: { is_active: true },
  });
}

void beforeAll(async () => {
  await seedBaseline();
}, 30000);

afterAll(async () => {
  await prisma.$disconnect();
});