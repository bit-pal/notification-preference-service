import { describe, expect, it } from "vitest";
import { isBlockedByQuietHours, isWithinQuietHours } from "./quiet-hours.js";

describe("quiet hours", () => {
  const config = {
    timezone: "Europe/Berlin",
    startTime: "22:00",
    endTime: "08:00",
    blockedTypes: ["marketing_push" as const],
  };

  it("blocks marketing push during overnight quiet hours", () => {
    const datetime = new Date("2026-05-21T21:30:00Z");
    expect(isBlockedByQuietHours(datetime, config, "marketing_push")).toBe(true);
  });

  it("allows transactional push during quiet hours", () => {
    const datetime = new Date("2026-05-21T21:30:00Z");
    expect(isBlockedByQuietHours(datetime, config, "transactional_push")).toBe(
      false
    );
  });

  it("allows marketing push outside quiet hours", () => {
    const datetime = new Date("2026-05-21T10:00:00Z");
    expect(isBlockedByQuietHours(datetime, config, "marketing_push")).toBe(
      false
    );
  });

  it("detects same-day quiet window", () => {
    const dayConfig = {
      timezone: "UTC",
      startTime: "12:00",
      endTime: "14:00",
      blockedTypes: ["marketing_email" as const],
    };
    expect(isWithinQuietHours(new Date("2026-05-21T12:30:00Z"), dayConfig)).toBe(
      true
    );
    expect(isWithinQuietHours(new Date("2026-05-21T15:00:00Z"), dayConfig)).toBe(
      false
    );
  });
});
