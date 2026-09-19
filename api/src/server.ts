import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";

const app = createApp();

app.listen(env.port, () => {
  console.log(`shega-admin-api listening on ${env.publicApiUrl || `http://localhost:${env.port}/api`}`);
});

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}; shutting down...`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));