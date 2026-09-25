import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "mysql://shega_dev:491INPToIK3HuCUJqp5l55PT@127.0.0.1:3306/shega_admin_test",
      JWT_SECRET: "shega-test-secret-not-for-production",
      CORS_ALLOWED_ORIGINS: "http://localhost:3000",
      RATE_LIMIT_GLOBAL: "0",
      RATE_LIMIT_LOGIN: "100",
      RATE_LIMIT_REGISTER: "0",
      RATE_LIMIT_ADMIN: "2000",
      SMTP_HOST: "",
    },
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 20000,
    hookTimeout: 30000,
    sequence: {
      shuffle: false,
    },
    fileParallelism: false,
  },
});