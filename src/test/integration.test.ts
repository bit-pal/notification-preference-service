import { afterAll, afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../api/app.js";
import { PreferenceService } from "../application/preference-service.js";
import { closePool, getPool } from "../infrastructure/db/pool.js";
import { createLogger } from "../infrastructure/logging/logger.js";
import { PreferenceRepository } from "../infrastructure/repositories/preference-repository.js";
import { initializeTestDatabase, resetUserData } from "./db-init.js";

const repository = new PreferenceRepository();
const service = new PreferenceService(repository, createLogger());
const app = createApp(service, createLogger());

const databaseReady = await initializeTestDatabase();

describe.skipIf(!databaseReady)("notification preferences API", () => {

  afterEach(async () => {
    await resetUserData();
  });

  afterAll(async () => {
    await closePool();
  });

  it("returns default preferences for a new user", async () => {
    const res = await request(app).get("/users/user-1/preferences");
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe("user-1");

    const transactional = res.body.preferences.find(
      (p: { notificationType: string }) =>
        p.notificationType === "transactional_email"
    );
    const marketing = res.body.preferences.find(
      (p: { notificationType: string }) =>
        p.notificationType === "marketing_email"
    );

    expect(transactional?.enabled).toBe(true);
    expect(marketing?.enabled).toBe(false);
  });

  it("reflects user preference changes", async () => {
    await request(app).get("/users/user-2/preferences");

    await request(app)
      .post("/users/user-2/preferences")
      .send({
        preferences: [
          {
            notificationType: "marketing_email",
            channel: "email",
            enabled: true,
          },
        ],
      });

    const enabled = await request(app).post("/evaluate").send({
      userId: "user-2",
      notificationType: "marketing_email",
      channel: "email",
      region: "US",
      datetime: "2026-05-21T12:00:00Z",
    });
    expect(enabled.body.decision).toBe("allow");

    await request(app)
      .post("/users/user-2/preferences")
      .send({
        preferences: [
          {
            notificationType: "marketing_email",
            channel: "email",
            enabled: false,
          },
        ],
      });

    const denyMarketing = await request(app).post("/evaluate").send({
      userId: "user-2",
      notificationType: "marketing_email",
      channel: "email",
      region: "US",
      datetime: "2026-05-21T12:00:00Z",
    });
    expect(denyMarketing.body.decision).toBe("deny");
    expect(denyMarketing.body.reason).toBe("disabled_by_user_preference");

    const allowTransactional = await request(app).post("/evaluate").send({
      userId: "user-2",
      notificationType: "transactional_email",
      channel: "email",
      region: "US",
      datetime: "2026-05-21T12:00:00Z",
    });
    expect(allowTransactional.body.decision).toBe("allow");
  });

  it("blocks marketing push during quiet hours but allows transactional", async () => {
    await request(app).get("/users/user-3/preferences");

    await request(app)
      .post("/users/user-3/preferences")
      .send({
        preferences: [
          {
            notificationType: "marketing_push",
            channel: "push",
            enabled: true,
          },
        ],
        quietHours: {
          timezone: "Europe/Berlin",
          startTime: "22:00",
          endTime: "08:00",
          blockedTypes: ["marketing_push"],
        },
      });

    const duringQuiet = await request(app).post("/evaluate").send({
      userId: "user-3",
      notificationType: "marketing_push",
      channel: "push",
      region: "US",
      datetime: "2026-05-21T21:30:00Z",
    });
    expect(duringQuiet.body).toEqual({
      decision: "deny",
      reason: "blocked_by_quiet_hours",
    });

    const transactional = await request(app).post("/evaluate").send({
      userId: "user-3",
      notificationType: "transactional_push",
      channel: "push",
      region: "US",
      datetime: "2026-05-21T21:30:00Z",
    });
    expect(transactional.body.decision).toBe("allow");
  });

  it("applies global policy for region", async () => {
    await request(app).get("/users/user-4/preferences");

    await request(app)
      .post("/users/user-4/preferences")
      .send({
        preferences: [
          {
            notificationType: "marketing_sms",
            channel: "sms",
            enabled: true,
          },
        ],
      });

    const eu = await request(app).post("/evaluate").send({
      userId: "user-4",
      notificationType: "marketing_sms",
      channel: "sms",
      region: "EU",
      datetime: "2026-05-21T12:00:00Z",
    });
    expect(eu.body).toEqual({
      decision: "deny",
      reason: "blocked_by_global_policy",
    });

    const us = await request(app).post("/evaluate").send({
      userId: "user-4",
      notificationType: "marketing_sms",
      channel: "sms",
      region: "US",
      datetime: "2026-05-21T12:00:00Z",
    });
    expect(us.body.decision).toBe("allow");
  });

  it("is idempotent for repeated preference updates", async () => {
    await request(app).get("/users/user-5/preferences");

    const payload = {
      idempotencyKey: "disable-marketing-email-once",
      preferences: [
        {
          notificationType: "marketing_email",
          channel: "email",
          enabled: false,
        },
      ],
    };

    const first = await request(app)
      .post("/users/user-5/preferences")
      .send(payload);
    const second = await request(app)
      .post("/users/user-5/preferences")
      .send(payload);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const log = await getPool().query(
      `SELECT COUNT(*)::int AS count FROM preference_change_log WHERE idempotency_key = $1`,
      [payload.idempotencyKey]
    );
    expect(log.rows[0].count).toBe(1);

    const prefs = await request(app).get("/users/user-5/preferences");
    const marketing = prefs.body.preferences.find(
      (p: { notificationType: string }) =>
        p.notificationType === "marketing_email"
    );
    expect(marketing?.enabled).toBe(false);
  });
});
