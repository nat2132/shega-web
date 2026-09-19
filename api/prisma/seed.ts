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
  const email = process.env.SEED_ADMIN_EMAIL || "admin@afran.net";
  const username = process.env.SEED_ADMIN_USERNAME || "admin";
  const password = requirePassword();
  const now = new Date();

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) {
    console.log(`Admin "${username}" already exists, skipping seed.`);
    return;
  }

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
