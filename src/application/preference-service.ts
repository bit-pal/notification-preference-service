import { evaluateNotification } from "../domain/preference-resolver.js";
import type {
  EvaluateInput,
  EvaluateResult,
  UpdatePreferencesRequest,
  UserPreferences,
} from "../domain/types.js";
import type { PreferenceRepository } from "../infrastructure/repositories/preference-repository.js";
import type { Logger } from "../infrastructure/logging/logger.js";

export class PreferenceService {
  constructor(
    private readonly repository: PreferenceRepository,
    private readonly logger: Logger
  ) {}

  async getOrCreatePreferences(userId: string): Promise<UserPreferences> {
    const exists = await this.repository.userExists(userId);
    if (!exists) {
      await this.repository.createUserWithDefaults(userId);
      this.logger.info({ userId, event: "user_created" }, "user created with defaults");
    }

    const preferences = await this.repository.mergePreferences(userId);
    const quietHours = await this.repository.getQuietHours(userId);

    return {
      userId,
      preferences,
      quietHours,
    };
  }

  async updatePreferences(
    userId: string,
    request: UpdatePreferencesRequest
  ): Promise<UserPreferences> {
    const { applied } = await this.repository.updatePreferences(userId, request);

    if (applied) {
      this.logger.info(
        { userId, event: "preferences_updated", request },
        "preferences updated"
      );
    } else {
      this.logger.info(
        { userId, event: "preferences_update_skipped", idempotencyKey: request.idempotencyKey },
        "idempotent update skipped"
      );
    }

    return this.getOrCreatePreferences(userId);
  }

  async evaluate(input: EvaluateInput): Promise<EvaluateResult> {
    const exists = await this.repository.userExists(input.userId);
    if (!exists) {
      await this.repository.createUserWithDefaults(input.userId);
    }

    const preferences = await this.repository.mergePreferences(input.userId);
    const quietHours = await this.repository.getQuietHours(input.userId);
    const globalPolicies = await this.repository.getGlobalPolicies();

    const result = evaluateNotification(input, {
      preferences,
      quietHours,
      globalPolicies,
    });

    this.logger.info(
      {
        event: "notification_evaluated",
        userId: input.userId,
        notificationType: input.notificationType,
        channel: input.channel,
        region: input.region,
        decision: result.decision,
        reason: result.reason,
      },
      "notification evaluated"
    );

    return result;
  }
}
