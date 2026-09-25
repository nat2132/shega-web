import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app, resetDb } from "./helpers";

beforeEach(async () => {
  await resetDb();
});

describe("POST /api/auth/register", () => {
  it("registers a customer and returns tokens + user", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "register-ok@test.example",
      password: "Customer-12345",
      password2: "Customer-12345",
      first_name: "Alem",
      last_name: "Bekele",
      phone: "+251911223344",
      business_name: "Alem Trading",
    });
    expect(res.status).toBe(201);
    expect(res.body.access).toBeTruthy();
    expect(res.body.refresh).toBeTruthy();
    expect(res.body.user.email).toBe("register-ok@test.example");
    expect(res.body.user.is_customer).toBe(true);
    expect(res.body.user.is_staff).toBe(false);
    expect(res.body.user.first_name).toBe("Alem");
    expect(res.body.user.business_name).toBe("Alem Trading");
    expect(res.body.user.password).toBeUndefined();
  });

  it("derives username from first/last name when none provided", async () => {
    await request(app).post("/api/auth/register").send({
      email: "username-derive@test.example",
      password: "Customer-12345",
      password2: "Customer-12345",
      first_name: "Sara",
      last_name: "Haile",
    });
    const welcome = await request(app).post("/api/auth/login").send({
      username: "username-derive@test.example",
      password: "Customer-12345",
    });
    expect(welcome.status).toBe(200);
  });

  it("rejects duplicate email", async () => {
    const payload = {
      email: "dup@test.example",
      password: "Customer-12345",
      password2: "Customer-12345",
      first_name: "Ada",
    };
    const first = await request(app).post("/api/auth/register").send(payload);
    expect(first.status).toBe(201);
    const second = await request(app).post("/api/auth/register").send(payload);
    expect(second.status).toBe(400);
    expect(second.body.email).toBeDefined();
  });

  it("rejects mismatched passwords", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "nomatch@test.example",
      password: "Customer-12345",
      password2: "Different-12345",
      first_name: "Ada",
    });
    expect(res.status).toBe(400);
    expect(res.body.password2).toBeDefined();
  });

  it("rejects short passwords", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "shortpw@test.example",
      password: "short",
      password2: "short",
      first_name: "Ada",
    });
    expect(res.status).toBe(400);
    expect(res.body.password).toBeDefined();
  });

  it("rejects invalid email", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "not-an-email",
      password: "Customer-12345",
      password2: "Customer-12345",
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with email and issues tokens", async () => {
    await request(app).post("/api/auth/register").send({
      email: "login-ok@test.example",
      password: "Customer-12345",
      password2: "Customer-12345",
      first_name: "Log",
    });
    const res = await request(app).post("/api/auth/login").send({
      username: "login-ok@test.example",
      password: "Customer-12345",
    });
    expect(res.status).toBe(200);
    expect(res.body.access).toBeTruthy();
    expect(res.body.refresh).toBeTruthy();
    expect(res.body.user.email).toBe("login-ok@test.example");
  });

  it("rejects wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      username: "admin",
      password: "wrong-password",
    });
    expect(res.status).toBe(401);
    expect(res.body.detail).toMatch(/credentials/);
  });
});

describe("GET /api/auth/profile", () => {
  it("returns the current user", async () => {
    const reg = await request(app).post("/api/auth/register").send({
      email: "profile-me@test.example",
      password: "Customer-12345",
      password2: "Customer-12345",
      first_name: "Pro",
      last_name: "File",
    });
    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${reg.body.access}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("profile-me@test.example");
  });

  it("rejects anonymous users", async () => {
    const res = await request(app).get("/api/auth/profile");
    expect(res.status).toBe(401);
  });
});