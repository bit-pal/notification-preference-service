import type { PoolClient } from "pg";
import type { Channel, NotificationType } from "../../domain/types.js";

const DEFAULTS: Array<{
  notificationType: NotificationType;
  channel: Channel;
  enabled: boolean;
}> = [
  { notificationType: "transactional_email", channel: "email", enabled: true },
  { notificationType: "marketing_email", channel: "email", enabled: false },
  { notificationType: "marketing_sms", channel: "sms", enabled: false },
  { notificationType: "marketing_push", channel: "push", enabled: false },
  { notificationType: "transactional_push", channel: "push", enabled: true },
  { notificationType: "transactional_sms", channel: "sms", enabled: true },
];

export async function seedDefaults(client: PoolClient): Promise<void> {
  for (const row of DEFAULTS) {
    await client.query(
      `INSERT INTO default_preferences (notification_type, channel, enabled)
       VALUES ($1, $2, $3)
       ON CONFLICT (notification_type, channel) DO NOTHING`,
      [row.notificationType, row.channel, row.enabled]
    );
  }

  await client.query(
    `INSERT INTO global_policies (notification_type, channel, region, allowed)
     VALUES ('marketing_sms', 'sms', 'EU', false)
     ON CONFLICT (notification_type, channel, region) DO NOTHING`
  );
}
