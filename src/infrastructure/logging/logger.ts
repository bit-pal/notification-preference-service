import pino from "pino";

export type Logger = pino.Logger;

export function createLogger(): Logger {
  return pino({
    level: process.env.LOG_LEVEL ?? "info",
    transport:
      process.env.NODE_ENV === "test"
        ? undefined
        : {
            target: "pino/file",
            options: { destination: 1 },
          },
  });
}
