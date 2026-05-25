import type { PoolClient } from "pg";
import type {
  Channel,
  ChannelPreference,
  GlobalPolicy,
  NotificationType,
  QuietHours,
  Region,
  UpdatePreferencesRequest,
} from "../../domain/types.js";
import { getPool, withTransaction } from "../db/pool.js";

function mapPreference(row: {
  notification_type: string;
  channel: string;
  enabled: boolean;
}): ChannelPreference {
  return {
    notificationType: row.notification_type as NotificationType,
    channel: row.channel as Channel,
    enabled: row.enabled,
  };
}

export class PreferenceRepository {
  async ensureUser(userId: string, client?: PoolClient): Promise<void> {
    const db = client ?? getPool();
    await db.query(
      `INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
      [userId]
    );
  }

  async getDefaultPreferences(client?: PoolClient): Promise<ChannelPreference[]> {
    const db = client ?? getPool();
    const result = await db.query(
      `SELECT notification_type, channel, enabled FROM default_preferences`
    );
    return result.rows.map(mapPreference);
  }

  async getUserOverrides(
    userId: string,
    client?: PoolClient
  ): Promise<ChannelPreference[]> {
    const db = client ?? getPool();
    const result = await db.query(
      `SELECT notification_type, channel, enabled
       FROM user_preferences WHERE user_id = $1`,
      [userId]
    );
    return result.rows.map(mapPreference);
  }

  async mergePreferences(userId: string): Promise<ChannelPreference[]> {
    const defaults = await this.getDefaultPreferences();
    const overrides = await this.getUserOverrides(userId);
    const map = new Map<string, ChannelPreference>();

    for (const pref of defaults) {
      const key = `${pref.notificationType}:${pref.channel}`;
      map.set(key, { ...pref });
    }

    for (const pref of overrides) {
      const key = `${pref.notificationType}:${pref.channel}`;
      map.set(key, { ...pref });
    }

    return Array.from(map.values());
  }

  async getQuietHours(
    userId: string,
    client?: PoolClient
  ): Promise<QuietHours | null> {
    const db = client ?? getPool();
    const result = await db.query(
      `SELECT timezone, start_time, end_time, blocked_types
       FROM user_quiet_hours WHERE user_id = $1`,
      [userId]
    );
    if (result.rowCount === 0) {
      return null;
    }
    const row = result.rows[0];
    return {
      timezone: row.timezone,
      startTime: row.start_time,
      endTime: row.end_time,
      blockedTypes: row.blocked_types as NotificationType[],
    };
  }

  async getGlobalPolicies(client?: PoolClient): Promise<GlobalPolicy[]> {
    const db = client ?? getPool();
    const result = await db.query(
      `SELECT notification_type, channel, region, allowed FROM global_policies`
    );
    return result.rows.map((row) => ({
      notificationType: row.notification_type as NotificationType,
      channel: row.channel as Channel,
      region: row.region as Region,
      allowed: row.allowed,
    }));
  }

  async userExists(userId: string): Promise<boolean> {
    const result = await getPool().query(
      `SELECT 1 FROM users WHERE id = $1`,
      [userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async hasIdempotencyKey(key: string): Promise<boolean> {
    const result = await getPool().query(
      `SELECT 1 FROM preference_change_log WHERE idempotency_key = $1`,
      [key]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async updatePreferences(
    userId: string,
    request: UpdatePreferencesRequest
  ): Promise<{ applied: boolean }> {
    if (request.idempotencyKey) {
      const exists = await this.hasIdempotencyKey(request.idempotencyKey);
      if (exists) {
        return { applied: false };
      }
    }

    await withTransaction(async (client) => {
      await this.ensureUser(userId, client);

      if (request.idempotencyKey) {
        await client.query(
          `INSERT INTO preference_change_log (idempotency_key, user_id, payload)
           VALUES ($1, $2, $3)`,
          [request.idempotencyKey, userId, JSON.stringify(request)]
        );
      }

      if (request.preferences) {
        for (const pref of request.preferences) {
          await client.query(
            `INSERT INTO user_preferences (user_id, notification_type, channel, enabled, updated_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (user_id, notification_type, channel)
             DO UPDATE SET enabled = $4, updated_at = NOW()`,
            [userId, pref.notificationType, pref.channel, pref.enabled]
          );
        }
      }

      if (request.quietHours !== undefined) {
        if (request.quietHours === null) {
          await client.query(
            `DELETE FROM user_quiet_hours WHERE user_id = $1`,
            [userId]
          );
        } else {
          const qh = request.quietHours;
          await client.query(
            `INSERT INTO user_quiet_hours (user_id, timezone, start_time, end_time, blocked_types, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (user_id)
             DO UPDATE SET timezone = $2, start_time = $3, end_time = $4,
               blocked_types = $5, updated_at = NOW()`,
            [
              userId,
              qh.timezone,
              qh.startTime,
              qh.endTime,
              JSON.stringify(qh.blockedTypes),
            ]
          );
        }
      }
    });

    return { applied: true };
  }

  async createUserWithDefaults(userId: string): Promise<void> {
    await withTransaction(async (client) => {
      await this.ensureUser(userId, client);
    });
  }
}
