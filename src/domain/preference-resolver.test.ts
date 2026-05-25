import { describe, expect, it } from "vitest";
import { evaluateNotification } from "./preference-resolver.js";
import type { ChannelPreference, GlobalPolicy } from "./types.js";

const basePreferences: ChannelPreference[] = [
  { notificationType: "transactional_email", channel: "email", enabled: true },
  { notificationType: "marketing_email", channel: "email", enabled: false },
];

describe("preference resolver", () => {
  it("allows when preference enabled and no policy", () => {
    const result = evaluateNotification(
      {
        userId: "u1",
        notificationType: "transactional_email",
        channel: "email",
        region: "US",
        datetime: new Date(),
      },
      { preferences: basePreferences, quietHours: null, globalPolicies: [] }
    );
    expect(result).toEqual({ decision: "allow", reason: "allowed" });
  });

  it("denies disabled preference", () => {
    const result = evaluateNotification(
      {
        userId: "u1",
        notificationType: "marketing_email",
        channel: "email",
        region: "US",
        datetime: new Date(),
      },
      { preferences: basePreferences, quietHours: null, globalPolicies: [] }
    );
    expect(result).toEqual({
      decision: "deny",
      reason: "disabled_by_user_preference",
    });
  });

  it("denies by global policy", () => {
    const policies: GlobalPolicy[] = [
      {
        notificationType: "marketing_sms",
        channel: "sms",
        region: "EU",
        allowed: false,
      },
    ];
    const prefs: ChannelPreference[] = [
      { notificationType: "marketing_sms", channel: "sms", enabled: true },
    ];
    const result = evaluateNotification(
      {
        userId: "u1",
        notificationType: "marketing_sms",
        channel: "sms",
        region: "EU",
        datetime: new Date(),
      },
      { preferences: prefs, quietHours: null, globalPolicies: policies }
    );
    expect(result).toEqual({
      decision: "deny",
      reason: "blocked_by_global_policy",
    });
  });
});
