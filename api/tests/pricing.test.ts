import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app, resetDb } from "./helpers";

beforeEach(async () => {
  await resetDb();
});

describe("GET /api/plans (public pricing)", () => {
  it("lists active plans with correct pricing fields, no auth required", async () => {
    const res = await request(app).get("/api/plans");
    expect(res.status).toBe(200);
    const plans = res.body as Array<Record<string, any>>;
    expect(plans.length).toBe(3);

    for (const plan of plans) {
      expect(plan.id).toBeGreaterThan(0);
      expect(plan.name).toBeTruthy();
      expect(plan.price).toBeGreaterThan(0);
      expect(plan.addon_mobile_price).toBeGreaterThan(0);
      expect(plan.addon_desktop_price).toBeGreaterThan(0);
      expect(plan.addon_business_price).toBeGreaterThan(0);
      expect(typeof plan.included_mobile_devices).toBe("number");
      expect(typeof plan.included_desktop_devices).toBe("number");
      expect(typeof plan.included_businesses).toBe("number");
      expect(plan.is_active).toBe(true);
    }

    const byName = Object.fromEntries(plans.map((p) => [p.name, p]));
    expect(byName["Mobile"].price).toBe(4500);
    expect(byName["Desktop"].price).toBe(7500);
    expect(byName["Mobile + Desktop"].price).toBe(10000);
    expect(byName["Mobile"].included_mobile_devices).toBe(1);
    expect(byName["Mobile"].included_desktop_devices).toBe(0);
  });

  it("excludes inactive plans", async () => {
    const { prisma } = await import("../src/lib/prisma");
    const desktop = await prisma.plan.findFirstOrThrow({ where: { name: "Desktop" } });
    await prisma.plan.update({ where: { id: desktop.id }, data: { is_active: false } });
    const res = await request(app).get("/api/plans");
    expect(res.status).toBe(200);
    const names = (res.body as Array<{ name: string }>).map((p) => p.name);
    expect(names).not.toContain("Desktop");
    expect(names).toHaveLength(2);
  });
});