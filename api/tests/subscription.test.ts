import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app, resetDb, registerCustomer, adminToken, planByName, subscribeCustomer } from "./helpers";
import { prisma } from "../src/lib/prisma";

beforeEach(async () => {
  await resetDb();
});

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe("GET /api/subscription/status (shared engine)", () => {
  it("returns none for a fresh customer", async () => {
    const customer = await registerCustomer("sub-none@test.example");
    const res = await request(app).get("/api/subscription/status").set(auth(customer.access));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("none");
    expect(res.body.access).toBe("view_only");
    expect(res.body.plan_name).toBeNull();
    expect(res.body.license_key).toBeNull();
    expect(res.body.monthly.total).toBe(0);
  });

  it("matches the customer-scoped endpoint (same engine)", async () => {
    const customer = await registerCustomer("sub-match@test.example");
    const web = await request(app).get("/api/customers/subscription/status").set(auth(customer.access));
    const mobile = await request(app).get("/api/subscription/status").set(auth(customer.access));
    expect(web.body).toEqual(mobile.body);
  });
});

describe("POST /api/subscription/trial", () => {
  it("starts a 7-day trial with the plan's caps and full access", async () => {
    const customer = await registerCustomer("trial@test.example");
    const plan = await planByName("Mobile");
    const res = await request(app)
      .post("/api/subscription/trial")
      .set(auth(customer.access))
      .send({ plan_id: plan.id });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("trial");
    expect(res.body.access).toBe("full");
    expect(res.body.is_trial).toBe(true);
    expect(res.body.trial_days_remaining).toBe(7);
    expect(res.body.days_remaining).toBe(7);
    expect(res.body.plan_name).toBe("Mobile");
    expect(res.body.license_key).toMatch(/^ERP-/);
    expect(res.body.devices.mobile.allocated).toBe(1);
    expect(res.body.devices.desktop.allocated).toBe(0);
    expect(res.body.businesses.allocated).toBe(1);
    expect(res.body.monthly.base_price).toBe(4500);
    expect(res.body.monthly.total).toBe(4500);

    const license = await prisma.license.findFirstOrThrow({ where: { customer_id: customer.user.id } });
    expect(license.is_trial).toBe(true);
    expect(license.status).toBe("active");
    const days = Math.round((license.expiry_date!.getTime() - license.start_date.getTime()) / 86400000);
    expect(days).toBe(7);

    const audit = await prisma.licenseAuditLog.findFirst({ where: { license_id: license.id } });
    expect(audit?.action).toBe("trial_started");
  });

  it("is one-trial-per-account", async () => {
    const customer = await registerCustomer("trial-once@test.example");
    const plan = await planByName("Desktop");
    const first = await request(app)
      .post("/api/subscription/trial")
      .set(auth(customer.access))
      .send({ plan_id: plan.id });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/subscription/trial")
      .set(auth(customer.access))
      .send({ plan_id: plan.id });
    expect(second.status).toBe(409);
    expect(second.body.detail).toMatch(/already been used/);
  });

  it("rejects a trial when a subscription already exists", async () => {
    const { customer } = await subscribeCustomer("Mobile");
    const plan = await planByName("Desktop");
    const blocked = await request(app)
      .post("/api/subscription/trial")
      .set(auth(customer.access))
      .send({ plan_id: plan.id });
    expect(blocked.status).toBe(409);
    expect(blocked.body.detail).toMatch(/already has a subscription/);
  });

  it("blocks trials while a payment is pending review", async () => {
    const customer = await registerCustomer("trial-pending@test.example");
    const plan = await planByName("Mobile");
    await request(app)
      .post("/api/payments/create")
      .set(auth(customer.access))
      .send({ plan_id: plan.id, transaction_id: "TXN-TRIAL-PENDING" });

    const res = await request(app)
      .post("/api/subscription/trial")
      .set(auth(customer.access))
      .send({ plan_id: plan.id });
    expect(res.status).toBe(409);
    expect(res.body.detail).toMatch(/awaiting review/);
  });

  it("rejects invalid plans and requires authentication", async () => {
    const customer = await registerCustomer("trial-bad@test.example");
    const bad = await request(app)
      .post("/api/subscription/trial")
      .set(auth(customer.access))
      .send({ plan_id: 9999 });
    expect(bad.status).toBe(400);

    const anon = await request(app).post("/api/subscription/trial").send({ plan_id: 1 });
    expect(anon.status).toBe(401);
  });
});

describe("payment lifecycle states", () => {
  it("pending_payment before approval, active after approval", async () => {
    const customer = await registerCustomer("state-pending@test.example");
    const plan = await planByName("Mobile");
    const headers = auth(customer.access);

    const none = await request(app).get("/api/subscription/status").set(headers);
    expect(none.body.status).toBe("none");

    const pay = await request(app)
      .post("/api/payments/create")
      .set(headers)
      .send({ plan_id: plan.id, transaction_id: "TXN-STATE-1" });
    expect(pay.status).toBe(201);

    const pending = await request(app).get("/api/subscription/status").set(headers);
    expect(pending.body.status).toBe("pending_payment");
    expect(pending.body.access).toBe("view_only");
    expect(pending.body.pending_payment).toBeTruthy();
    expect(pending.body.pending_payment.payment_id).toBe(pay.body.id);
    expect(pending.body.pending_payment.amount).toBe(4500);

    const token = await adminToken();
    await request(app)
      .post(`/api/admin/payments/${pay.body.id}/approve`)
      .set(auth(token))
      .send({});

    const active = await request(app).get("/api/subscription/status").set(headers);
    expect(active.body.status).toBe("active");
    expect(active.body.access).toBe("full");
    expect(active.body.license_key).toMatch(/^ERP-/);
    expect(active.body.plan_name).toBe("Mobile");
  });

  it("payment_rejected carries the reason and flips back on resubmission", async () => {
    const customer = await registerCustomer("state-rejected@test.example");
    const plan = await planByName("Desktop");
    const headers = auth(customer.access);

    const pay = await request(app)
      .post("/api/payments/create")
      .set(headers)
      .send({ plan_id: plan.id, transaction_id: "TXN-REJ-STATE" });

    const token = await adminToken();
    await request(app)
      .post(`/api/admin/payments/${pay.body.id}/reject`)
      .set(auth(token))
      .send({ reason: "Screenshot missing the transaction reference." });

    const rejected = await request(app).get("/api/subscription/status").set(headers);
    expect(rejected.body.status).toBe("payment_rejected");
    expect(rejected.body.access).toBe("view_only");
    expect(rejected.body.last_payment.reason).toMatch(/transaction reference/);

    const resubmit = await request(app)
      .post("/api/payments/create")
      .set(headers)
      .send({ plan_id: plan.id, transaction_id: "TXN-REJ-STATE-2" });
    expect(resubmit.status).toBe(201);

    const backToPending = await request(app).get("/api/subscription/status").set(headers);
    expect(backToPending.body.status).toBe("pending_payment");
    expect(backToPending.body.access).toBe("view_only");
  });

  it("keeps an active subscription active while an add-on payment is pending", async () => {
    const { customer, plan } = await subscribeCustomer("Mobile");
    const headers = auth(customer.access);

    const addOn = await request(app)
      .post("/api/payments/create")
      .set(headers)
      .send({
        plan_id: plan.id,
        payment_type: "additional_desktop_device",
        license_id: (await prisma.license.findFirstOrThrow({ where: { customer_id: customer.user.id } })).id,
        transaction_id: "TXN-ADDON-PENDING",
      });
    expect(addOn.status).toBe(201);

    const status = await request(app).get("/api/subscription/status").set(headers);
    expect(status.body.status).toBe("active");
    expect(status.body.access).toBe("full");
    expect(status.body.pending_payment.payment_id).toBe(addOn.body.id);
    expect(status.body.pending_payment.amount).toBe(800);
  });

  it("expires a lapsed trial to view-only", async () => {
    const customer = await registerCustomer("state-expired@test.example");
    const plan = await planByName("Mobile");
    await request(app).post("/api/subscription/trial").set(auth(customer.access)).send({ plan_id: plan.id });

    const yesterday = new Date(Date.now() - 24 * 3600_000);
    await prisma.license.updateMany({
      where: { customer_id: customer.user.id },
      data: { expiry_date: yesterday },
    });

    const status = await request(app).get("/api/subscription/status").set(auth(customer.access));
    expect(status.body.status).toBe("expired");
    expect(status.body.access).toBe("view_only");
    expect(status.body.is_trial).toBe(true);
    expect(status.body.days_remaining).toBe(0);
  });
});

describe("POST /api/customers/payments (web transaction id)", () => {
  it("stores a customer-submitted transaction id", async () => {
    const customer = await registerCustomer("web-txn@test.example");
    const plan = await planByName("Mobile");
    const res = await request(app)
      .post("/api/customers/payments")
      .set(auth(customer.access))
      .send({ plan: plan.id, payment_method: "cbe", transaction_id: "CBE-REF-445566" });
    expect(res.status).toBe(201);
    expect(res.body.transaction_id).toBe("CBE-REF-445566");
    expect(res.body.amount).toBe(4500);
    expect(res.body.status).toBe("pending");

    const dup = await request(app)
      .post("/api/customers/payments")
      .set(auth(customer.access))
      .send({ plan: plan.id, payment_method: "cbe", transaction_id: "CBE-REF-445566" });
    expect(dup.status).toBe(400);
  });

  it("generates a transaction id when the customer omits it", async () => {
    const customer = await registerCustomer("web-gen@test.example");
    const plan = await planByName("Desktop");
    const res = await request(app)
      .post("/api/customers/payments")
      .set(auth(customer.access))
      .send({ plan: plan.id, payment_method: "telebirr" });
    expect(res.status).toBe(201);
    expect(res.body.transaction_id).toMatch(/^TXN-/);
  });
});
