import { z } from "zod";
import {
  CHANNELS,
  NOTIFICATION_TYPES,
  REGIONS,
} from "../domain/types.js";

const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);
const channelSchema = z.enum(CHANNELS);
const regionSchema = z.enum(REGIONS);

const quietHoursSchema = z.object({
  timezone: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  blockedTypes: z.array(notificationTypeSchema),
});

export const updatePreferencesBodySchema = z.object({
  preferences: z
    .array(
      z.object({
        notificationType: notificationTypeSchema,
        channel: channelSchema,
        enabled: z.boolean(),
      })
    )
    .optional(),
  quietHours: quietHoursSchema.nullable().optional(),
  idempotencyKey: z.string().min(1).max(256).optional(),
});

export const evaluateBodySchema = z.object({
  userId: z.string().min(1),
  notificationType: notificationTypeSchema,
  channel: channelSchema,
  region: regionSchema,
  datetime: z.string().datetime(),
});

export type UpdatePreferencesBody = z.infer<typeof updatePreferencesBodySchema>;
export type EvaluateBody = z.infer<typeof evaluateBodySchema>;
