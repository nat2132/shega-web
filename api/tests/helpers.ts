import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

export const app: Express = createApp();

export interface TestCustomer {
  access: string;
  user: {
    id: number;
    email: string;
    is_customer: boolean;
    [key: string]: unknown;
  };
}

export async function planByName(name: string) {
  const plan = await prisma.plan.findFirst({ where: { name } });
  if (!plan) throw new Error(`Plan "${name}" not seeded`);
  return plan;
}

/**
 * Wipes test data but keeps the baseline admin user + seeded plans.
 * Run in beforeEach so tests are deterministic.
 */
export async function resetDb(): Promise<void> {
  await prisma.licenseAuditLog.deleteMany();
  await prisma.deviceActivation.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.license.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.businessMembership.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.contactMessage.deleteMany();
  await prisma.loginAttempt.deleteMany();
  await prisma.adminSession.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.appVersion.deleteMany();
  await prisma.supportReply.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.user.deleteMany({ where: { is_admin: false } });
}

export async function registerCustomer(email: string): Promise<TestCustomer> {
  const res = await request(app).post("/api/auth/register").send({
    email,
    password: "Customer-12345",
    password2: "Customer-12345",
    first_name: "Test",
    last_name: "User",
    phone: "+251911123456",
    business_name: "Test Business PLC",
  });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { access: res.body.access, user: res.body.user };
}

export async function adminToken(): Promise<string> {
  const res = await request(app).post("/api/auth/login").send({ username: "admin", password: "TestAdmin-2026!" });
  if (res.status !== 200 || !res.body.access) {
    throw new Error(`admin login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.access;
}

export async function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function adminUser() {
  return (await prisma.user.findFirstOrThrow({ where: { username: "admin" } }));
}

/**
 * End-to-end helper: register a customer, subscribe them to the named plan
 * with a server-computed payment, and approve it as admin. Returns the
 * license key + tokens for downstream license/device tests.
 */
export async function subscribeCustomer(planName: string): Promise<{
  licenseKey: string;
  licenseId: number;
  paymentId: number;
  customer: TestCustomer;
  plan: { id: number; price: number };
}> {
  const customer = await registerCustomer(`sub-${Date.now()}-${planName}@test.example`);
  const plan = await planByName(planName);
  const headers = await auth(customer.access);
  const payRes = await request(app)
    .post("/api/payments/create")
    .set(headers)
    .send({ plan_id: plan.id, payment_type: "subscription", payment_method: "telebirr", transaction_id: `TXN-SUB-${Date.now()}` });
  if (payRes.status !== 201) throw new Error(`payment create failed: ${payRes.status} ${JSON.stringify(payRes.body)}`);
  const paymentId = payRes.body.id as number;

  const token = await adminToken();
  const approveRes = await request(app)
    .post(`/api/admin/payments/${paymentId}/approve`)
    .set(await auth(token))
    .send({});
  if (approveRes.status !== 200) throw new Error(`approve failed: ${approveRes.status} ${JSON.stringify(approveRes.body)}`);

  const license = await prisma.license.findFirstOrThrow({ where: { customer_id: customer.user.id } });
  return { licenseKey: license.license_key, licenseId: license.id, paymentId, customer, plan };
}