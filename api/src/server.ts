import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";

const app = createApp();

const host = process.env.HOSTNAME || undefined;
if (host) {
  app.listen(env.port, host, () => {
    console.log(`shega-admin-api listening on ${env.publicApiUrl || `http://${host}:${env.port}/api`}`);
  });
} else {
  app.listen(env.port, () => {
    console.log(`shega-admin-api listening on ${env.publicApiUrl || `http://0.0.0.0:${env.port}/api`}`);
  });
}

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}; shutting down...`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));