import express, { type Express, type Request, type Response, type NextFunction } from "express";
import type { PreferenceService } from "../application/preference-service.js";
import type { Logger } from "../infrastructure/logging/logger.js";
import { createRoutes } from "./routes.js";

function requestLogging(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on("finish", () => {
      logger.info({
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - start,
      });
    });
    next();
  };
}

export function createApp(service: PreferenceService, logger: Logger): Express {
  const app = express();
  app.use(express.json());
  app.use(requestLogging(logger));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(createRoutes(service));

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      logger.error({ err }, "unhandled error");
      res.status(500).json({ error: "internal_error" });
    }
  );

  return app;
}
