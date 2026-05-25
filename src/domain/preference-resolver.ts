import { isBlockedByQuietHours, type QuietHoursConfig } from "./quiet-hours.js";
import type {
  ChannelPreference,
  EvaluateInput,
  EvaluateResult,
  GlobalPolicy,
} from "./types.js";

export interface ResolutionContext {
  preferences: ChannelPreference[];
  quietHours: QuietHoursConfig | null;
  globalPolicies: GlobalPolicy[];
}

function findPreference(
  preferences: ChannelPreference[],
  notificationType: EvaluateInput["notificationType"],
  channel: EvaluateInput["channel"]
): ChannelPreference | undefined {
  return preferences.find(
    (p) =>
      p.notificationType === notificationType && p.channel === channel
  );
}

function findGlobalPolicy(
  policies: GlobalPolicy[],
  notificationType: EvaluateInput["notificationType"],
  channel: EvaluateInput["channel"],
  region: EvaluateInput["region"]
): GlobalPolicy | undefined {
  const exact = policies.find(
    (p) =>
      p.notificationType === notificationType &&
      p.channel === channel &&
      p.region === region
  );
  if (exact) {
    return exact;
  }
  return policies.find(
    (p) =>
      p.notificationType === notificationType &&
      p.channel === channel &&
      p.region === "GLOBAL"
  );
}

export function evaluateNotification(
  input: EvaluateInput,
  context: ResolutionContext
): EvaluateResult {
  const policy = findGlobalPolicy(
    context.globalPolicies,
    input.notificationType,
    input.channel,
    input.region
  );

  if (policy && !policy.allowed) {
    return {
      decision: "deny",
      reason: "blocked_by_global_policy",
    };
  }

  const preference = findPreference(
    context.preferences,
    input.notificationType,
    input.channel
  );

  if (!preference || !preference.enabled) {
    return {
      decision: "deny",
      reason: "disabled_by_user_preference",
    };
  }

  if (
    context.quietHours &&
    isBlockedByQuietHours(
      input.datetime,
      context.quietHours,
      input.notificationType
    )
  ) {
    return {
      decision: "deny",
      reason: "blocked_by_quiet_hours",
    };
  }

  return {
    decision: "allow",
    reason: "allowed",
  };
}
