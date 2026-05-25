import { Router, type Request, type Response, type NextFunction } from "express";
import type { PreferenceService } from "../application/preference-service.js";
import {
  evaluateBodySchema,
  updatePreferencesBodySchema,
} from "./validation.js";

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

export function createRoutes(service: PreferenceService): Router {
  const router = Router();

  router.get(
    "/users/:id/preferences",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const prefs = await service.getOrCreatePreferences(paramId(req));
        res.json(prefs);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/users/:id/preferences",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const parsed = updatePreferencesBodySchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: "invalid_request", details: parsed.error.flatten() });
          return;
        }

        const prefs = await service.updatePreferences(paramId(req), parsed.data);
        res.json(prefs);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/evaluate",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const parsed = evaluateBodySchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: "invalid_request", details: parsed.error.flatten() });
          return;
        }

        const body = parsed.data;
        const result = await service.evaluate({
          userId: body.userId,
          notificationType: body.notificationType,
          channel: body.channel,
          region: body.region,
          datetime: new Date(body.datetime),
        });

        res.json({
          decision: result.decision,
          reason: result.reason,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
