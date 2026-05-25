import type { NotificationType } from "./types.js";
import { isTransactional } from "./types.js";

export interface QuietHoursConfig {
  timezone: string;
  startTime: string;
  endTime: string;
  blockedTypes: NotificationType[];
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getLocalMinutes(datetime: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(datetime);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

export function isWithinQuietHours(
  datetime: Date,
  config: QuietHoursConfig
): boolean {
  const current = getLocalMinutes(datetime, config.timezone);
  const start = parseTimeToMinutes(config.startTime);
  const end = parseTimeToMinutes(config.endTime);

  if (start === end) {
    return false;
  }

  if (start < end) {
    return current >= start && current < end;
  }

  return current >= start || current < end;
}

export function isBlockedByQuietHours(
  datetime: Date,
  config: QuietHoursConfig,
  notificationType: NotificationType
): boolean {
  if (isTransactional(notificationType)) {
    return false;
  }

  if (!config.blockedTypes.includes(notificationType)) {
    return false;
  }

  return isWithinQuietHours(datetime, config);
}
