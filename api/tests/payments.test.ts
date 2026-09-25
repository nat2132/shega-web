import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app, resetDb, registerCustomer, adminToken, planByName, subscribeCustomer } from "./helpers";
import { prisma } from "../src/lib/prisma";

beforeEach(async () => {
  await resetDb();
});

describe("POST /api/payments/create (wallet)", () => {
  it("requires authentication", async () => {
    const res = await request(app).post("/api/payments/create").send({ plan_id: 1, transaction_id: "TXN-0" });
    expect(res.status).toBe(401);
  });

  it("rejects an invalid plan", async () => {
    const customer = await registerCustomer("badplan@test.example");
    const res = await request(app)
      .post("/api/payments/create")
      .set("Authorization", `Bearer ${customer.access}`)
      .send({ plan_id: 9999, transaction_id: "TXN-1" });
    expect(res.status).toBe(400);
  });

  it("creates a subscription payment with the server-computed amount", async () => {
    const customer = await registerCustomer("amount@test.example");
    const plan = await planByName("Mobile");
    const res = await request(app)
      .post("/api/payments/create")
      .set("Authorization", `Bearer ${customer.access}`)
      .send({ plan_id: plan.id, payment_type: "subscription", transaction_id: "TXN-CALC-1" });
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(4500);
    expect(res.body.status).toBe("pending");
    expect(res.body.plan_name).toBe("Mobile");
    expect(res.body.transaction_id).toBe("TXN-CALC-1");
  });

  it("rejects duplicate transaction ids", async () => {
    const customer = await registerCustomer("duptxn@test.example");
    const plan = await planByName("Desktop");
    const headers = { Authorization: `Bearer ${customer.access}` };
    const body = { plan_id: plan.id, transaction_id: "TXN-DUP" };
    const first = await request(app).post("/api/payments/create").set(headers).send(body);
    expect(first.status).toBe(201);
    const again = await request(app).post("/api/payments/create").set(headers).send({ plan_id: plan.id, transaction_id: "TXN-DUP" });
    expect(again.status).toBe(400);
    expect(again.body.transaction_id).toBeDefined();
  });

  it("blocks a second pending payment for the same plan", async () => {
    const customer = await registerCustomer("twopend@test.example");
    const plan = await planByName("Mobile");
    const headers = { Authorization: `Bearer ${customer.access}` };
    const first = await request(app)
      .post("/api/payments/create")
      .set(headers)
      .send({ plan_id: plan.id, transaction_id: "TXN-P1" });
    expect(first.status).toBe(201);
    const second = await request(app)
      .post("/api/payments/create")
      .set(headers)
      .send({ plan_id: plan.id, transaction_id: "TXN-P2" });
    expect(second.status).toBe(409);
    expect(second.body.detail).toMatch(/pending payment/);
  });

  it("enforces the 3-payments-per-day cap", async () => {
    const customer = await registerCustomer("dailycap@test.example");
    const headers = { Authorization: `Bearer ${customer.access}` };
    const mobile = await planByName("Mobile");
    const desktop = await planByName("Desktop");
    const both = await planByName("Mobile + Desktop");
    for (const plan of [mobile, desktop, both]) {
      const res = await request(app)
        .post("/api/payments/create")
        .set(headers)
        .send({ plan_id: plan.id, transaction_id: `TXN-CAP-${plan.id}` });
      expect(res.status).toBe(201);
    }
    const over = await request(app)
      .post("/api/payments/create")
      .set(headers)
      .send({ plan_id: mobile.id, transaction_id: "TXN-CAP-OVER" });
    expect(over.status).toBe(429);
    expect(over.body.detail).toMatch(/maximum of 3/);
  });
});

describe("admin approve/reject → license + invoice lifecycle", () => {
  it("creates a license with plan caps and a paid invoice on approval", async () => {
    const customer = await registerCustomer("approve@test.example");
    const plan = await planByName("Mobile");
    const headers = { Authorization: `Bearer ${customer.access}` };

    const payRes = await request(app)
      .post("/api/payments/create")
      .set(headers)
      .send({ plan_id: plan.id, payment_type: "subscription", transaction_id: "TXN-APPR" });
    expect(payRes.status).toBe(201);

    const token = await adminToken();
    const approve = await request(app)
      .post(`/api/admin/payments/${payRes.body.id}/approve`)
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(approve.status).toBe(200);

    const license = await prisma.license.findFirstOrThrow({ where: { customer_id: customer.user.id } });
    expect(license.status).toBe("active");
    expect(license.plan_id).toBe(plan.id);
    expect(license.license_key).toMatch(/^ERP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(license.max_mobile_devices).toBe(1);
    expect(license.max_desktop_devices).toBe(0);
    expect(license.max_businesses).toBe(1);

    const invoice = await prisma.invoice.findFirstOrThrow({ where: { payment_id: payRes.body.id } });
    expect(invoice.status).toBe("paid");
    expect(Number(invoice.amount)).toBe(4500);
    expect(invoice.invoice_number).toMatch(/^INV-/);

    const subscription = await request(app).get("/api/subscription/status").set(headers);
    expect(subscription.body.status).toBe("active");
    expect(subscription.body.license_key).toBe(license.license_key);
    expect(subscription.body.plan_name).toBe("Mobile");

    const list = await request(app).get("/api/customers/licenses").set(headers);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].plan_details.price).toBe(4500);
  });

  it("extend the expiry on a renewal (no double-charge on caps)", async () => {
    const { licenseKey, customer, plan } = await subscribeCustomer("Desktop");
    const headers = { Authorization: `Bearer ${customer.access}` };
    const first = await prisma.license.findFirstOrThrow({ where: { license_key: licenseKey } });

    const payRes = await request(app)
      .post("/api/payments/create")
      .set(headers)
      .send({
        plan_id: plan.id,
        payment_type: "renewal",
        license_id: first.id,
        transaction_id: "TXN-RENEW-1",
      });
    expect(payRes.status).toBe(201);
    expect(payRes.body.amount).toBe(7500);

    const token = await adminToken();
    const approve = await request(app)
      .post(`/api/admin/payments/${payRes.body.id}/approve`)
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(approve.status).toBe(200);

    const after = await prisma.license.findFirstOrThrow({ where: { license_key: licenseKey } });
    const diffDays = Math.round((after.expiry_date!.getTime() - first.expiry_date!.getTime()) / 86400000);
    expect(diffDays).toBe(30);
    expect(after.status).toBe("active");
  });

  it("rejects a payment with a reason and notifies the customer", async () => {
    const customer = await registerCustomer("reject@test.example");
    const plan = await planByName("Mobile");
    const headers = { Authorization: `Bearer ${customer.access}` };
    const payRes = await request(app)
      .post("/api/payments/create")
      .set(headers)
      .send({ plan_id: plan.id, transaction_id: "TXN-REJ" });
    expect(payRes.status).toBe(201);

    const token = await adminToken();
    const reject = await request(app)
      .post(`/api/admin/payments/${payRes.body.id}/reject`)
      .set("Authorization", `Bearer ${token}`)
      .send({ reason: "Receipt is unreadable, please resubmit." });
    expect(reject.status).toBe(200);

    const stored = await prisma.payment.findFirstOrThrow({ where: { id: payRes.body.id } });
    expect(stored.status).toBe("rejected");
    expect(stored.reviewed_by_id).toBeTruthy();
    expect(stored.reviewed_at).toBeTruthy();

    const my = await request(app).get("/api/payments/my-payment").set(headers);
    expect(my.body.status).toBe("rejected");
    expect(my.body.reason).toMatch(/unreadable/);

    const notifs = await request(app).get("/api/customers/notifications").set(headers);
    expect(notifs.body.some((n: { notification_type: string }) => n.notification_type === "payment_rejected")).toBe(true);
  });
});

describe("add-on purchases", () => {
  it("rejects add-on payment without an active license", async () => {
    const customer = await registerCustomer("addon-nolic@test.example");
    const plan = await planByName("Mobile");
    const res = await request(app)
      .post("/api/payments/create")
      .set("Authorization", `Bearer ${customer.access}`)
      .send({ plan_id: plan.id, payment_type: "additional_mobile_device", transaction_id: "TXN-ADD0" });
    expect(res.status).toBe(400);
  });

  it("charges the add-on price and increases the cap on approval", async () => {
    const { licenseId, customer, plan } = await subscribeCustomer("Mobile");
    const headers = { Authorization: `Bearer ${customer.access}` };

    const payRes = await request(app)
      .post("/api/payments/create")
      .set(headers)
      .send({
        plan_id: plan.id,
        payment_type: "additional_mobile_device",
        license_id: licenseId,
        transaction_id: "TXN-ADD1",
      });
    expect(payRes.status).toBe(201);
    expect(payRes.body.amount).toBe(500);

    const token = await adminToken();
    const approve = await request(app)
      .post(`/api/admin/payments/${payRes.body.id}/approve`)
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(approve.status).toBe(200);

    const license = await prisma.license.findFirstOrThrow({ where: { id: licenseId } });
    expect(license.max_mobile_devices).toBe(2);
    expect(license.max_desktop_devices).toBe(0);
  });
});