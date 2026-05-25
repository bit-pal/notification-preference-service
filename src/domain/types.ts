export const CHANNELS = ["email", "sms", "push", "messenger"] as const;
export type Channel = (typeof CHANNELS)[number];

export const NOTIFICATION_TYPES = [
  "transactional_email",
  "marketing_email",
  "marketing_sms",
  "marketing_push",
  "transactional_push",
  "transactional_sms",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const REGIONS = ["EU", "US", "APAC", "GLOBAL"] as const;
export type Region = (typeof REGIONS)[number];

export type Decision = "allow" | "deny";

export type DenyReason =
  | "blocked_by_global_policy"
  | "disabled_by_user_preference"
  | "blocked_by_quiet_hours"
  | "user_not_found";

export interface ChannelPreference {
  notificationType: NotificationType;
  channel: Channel;
  enabled: boolean;
}

export interface QuietHours {
  timezone: string;
  startTime: string;
  endTime: string;
  blockedTypes: NotificationType[];
}

export interface UserPreferences {
  userId: string;
  preferences: ChannelPreference[];
  quietHours: QuietHours | null;
}

export interface GlobalPolicy {
  notificationType: NotificationType;
  channel: Channel;
  region: Region;
  allowed: boolean;
}

export interface EvaluateInput {
  userId: string;
  notificationType: NotificationType;
  channel: Channel;
  region: Region;
  datetime: Date;
}

export interface EvaluateResult {
  decision: Decision;
  reason?: DenyReason | "allowed";
}

export interface UpdatePreferenceCommand {
  notificationType: NotificationType;
  channel: Channel;
  enabled: boolean;
}

export interface UpdatePreferencesRequest {
  preferences?: UpdatePreferenceCommand[];
  quietHours?: QuietHours | null;
  idempotencyKey?: string;
}

export function parseNotificationType(value: string): NotificationType | null {
  return (NOTIFICATION_TYPES as readonly string[]).includes(value)
    ? (value as NotificationType)
    : null;
}

export function parseChannel(value: string): Channel | null {
  return (CHANNELS as readonly string[]).includes(value)
    ? (value as Channel)
    : null;
}

export function parseRegion(value: string): Region | null {
  return (REGIONS as readonly string[]).includes(value)
    ? (value as Region)
    : null;
}

export function isTransactional(type: NotificationType): boolean {
  return type.startsWith("transactional_");
}
