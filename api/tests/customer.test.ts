import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app, resetDb, registerCustomer, subscribeCustomer } from "./helpers";
import { prisma } from "../src/lib/prisma";

beforeEach(async () => {
  await resetDb();
});

describe("GET /api/customers/dashboard", () => {
  it("returns the overview contract for a fresh customer", async () => {
    const customer = await registerCustomer("dash-fresh@test.example");
    const res = await request(app)
      .get("/api/customers/dashboard")
      .set("Authorization", `Bearer ${customer.access}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("dash-fresh@test.example");
    expect(res.body.active_licenses).toBe(0);
    expect(res.body.expiring_soon).toBe(0);
    expect(res.body.total_payments).toBe(0);
    expect(res.body.next_renewal).toBeNull();
    expect(Array.isArray(res.body.recent_activity)).toBe(true);
    expect(res.body.recent_activity.length).toBeGreaterThan(0);
  });

  it("reports active license and next renewal after subscribing", async () => {
    const { customer } = await subscribeCustomer("Mobile");
    const res = await request(app)
      .get("/api/customers/dashboard")
      .set("Authorization", `Bearer ${customer.access}`);
    expect(res.status).toBe(200);
    expect(res.body.active_licenses).toBe(1);
    expect(res.body.total_payments).toBe(1);
    expect(res.body.next_renewal).toBeTruthy();
    expect(res.body.licenses).toHaveLength(1);
    expect(res.body.licenses[0].license_key).toBeTruthy();
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/customers/dashboard");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/customers/download", () => {
  it("returns the latest/history contract", async () => {
    const now = new Date();
    await prisma.appVersion.create({ data: { platform: "windows", version: "2.5.0", min_version: "2.0.0", is_force_update: false, release_notes: "- Fix bug\n- Better sync", download_url: "https://dl.shega.com/win/2.5.0.exe", created_at: now } });
    await prisma.appVersion.create({ data: { platform: "android", version: "2.4.8", min_version: "2.0.0", is_force_update: false, release_notes: "- APK patch", download_url: "https://dl.shega.com/android/2.4.8.apk", created_at: new Date(now.getTime() - 86400000) } });

    const customer = await registerCustomer("dl@test.example");
    const res = await request(app)
      .get("/api/customers/download")
      .set("Authorization", `Bearer ${customer.access}`);
    expect(res.status).toBe(200);
    expect(res.body.latest.version).toBe("2.5.0");
    expect(res.body.latest.release_notes).toContain("Fix bug");
    expect(res.body.history).toHaveLength(1);
    expect(res.body.history[0].version).toBe("2.4.8");
  });
});

describe("GET /api/customers/invoices", () => {
  it("lists the paid invoice after a subscription", async () => {
    const { customer, paymentId } = await subscribeCustomer("Desktop");
    const res = await request(app)
      .get("/api/customers/invoices")
      .set("Authorization", `Bearer ${customer.access}`);
    expect(res.status).toBe(200);
    const invoice = res.body.find((inv: { payment?: number; invoice_number: string }) => inv.payment === paymentId);
    expect(invoice).toBeDefined();
    expect(invoice.invoice_number).toMatch(/^INV-/);
    expect(invoice.status).toBe("paid");
    expect(invoice.amount).toBe(7500);
  });
});

describe("POST /api/contacts (public)", () => {
  it("accepts a valid contact message", async () => {
    const res = await request(app).post("/api/contacts").send({
      name: "Contact User",
      email: "contact@test.example",
      phone: "+251911000000",
      message: "I need help with an add-on purchase.",
    });
    expect(res.status).toBe(202);
    const stored = await prisma.contactMessage.findFirstOrThrow({ where: { email: "contact@test.example" } });
    expect(stored.subject).toBe("Website contact form");
    expect(stored.status).toBe("new");
  });

  it("requires a message", async () => {
    const res = await request(app).post("/api/contacts").send({
      name: "No Message",
      email: "m@test.example",
    });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid email", async () => {
    const res = await request(app).post("/api/contacts").send({
      name: "Bad Email",
      email: "nope",
      message: "hello",
    });
    expect(res.status).toBe(400);
  });
});