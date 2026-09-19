import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { stripTrailingSlash, notFoundHandler, errorHandler } from "./middleware/error";
import { authRouter } from "./modules/auth/auth.router";
import { businessesRouter } from "./modules/businesses/businesses.router";
import { plansRouter } from "./modules/plans/plans.router";
import { subscriptionsRouter } from "./modules/subscriptions/subscriptions.router";
import { paymentsRouter } from "./modules/payments/payments.router";
import { trialsRouter } from "./modules/trials/trials.router";
import { licensesRouter } from "./modules/licenses/licenses.router";
import { settingsRouter } from "./modules/settings/settings.router";
import { appVersionsRouter } from "./modules/app-versions/app-versions.router";
import { dashboardRouter } from "./modules/dashboard/dashboard.router";
import { auditLogsRouter } from "./modules/audit-logs/audit-logs.router";
import { adminsRouter } from "./modules/admin-users/admin-users.router";

export function createApp(): express.Express {
  const app = express();

  app.set("trust proxy", env.trustProxy);

  app.use(stripTrailingSlash);
  app.use(helmet());
  app.use(cors({ origin: env.corsAllowedOrigins, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  if (env.nodeEnv !== "test") {
    app.use(morgan("combined"));
  }

  if (env.rateLimitGlobal > 0) {
    app.use(
      rateLimit({
        windowMs: 60 * 1000,
        limit: env.rateLimitGlobal,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        handler: (_req: Request, res: Response) => {
          res.status(429).json({ detail: "Rate limit exceeded. Please try again later." });
        },
      }),
    );
  }

  app.use("/api/auth", authRouter);

  const adminApi = express.Router();
  adminApi.use("/businesses", businessesRouter);
  adminApi.use("/subscriptions", subscriptionsRouter);
  adminApi.use("/payments", paymentsRouter);
  adminApi.use("/trials", trialsRouter);
  adminApi.use("/settings", settingsRouter);
  adminApi.use("/app-versions", appVersionsRouter);
  adminApi.use("/dashboard", dashboardRouter);
  adminApi.use("/audit-logs", auditLogsRouter);
  adminApi.use("/admins", adminsRouter);
  app.use("/api/admin", adminApi);

  const licensesApi = express.Router();
  licensesApi.use("/plans", plansRouter);
  licensesApi.use("/", licensesRouter);
  app.use("/api/licenses", licensesApi);

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "shega-admin-api", time: new Date().toISOString() });
  });

  app.use(notFoundHandler);
  app.use(errorHandler as (err: unknown, req: Request, res: Response, next: NextFunction) => void);

  return app;
}