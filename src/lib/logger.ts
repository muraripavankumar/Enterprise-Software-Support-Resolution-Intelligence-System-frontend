type LogLevel = "debug" | "info" | "warn" | "error";

type LogMetadata = Record<string, string | number | boolean | null | undefined>;

const enabledDebug = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG_LOGS === "true";

function write(level: LogLevel, event: string, metadata: LogMetadata = {}) {
  if (level === "debug" && !enabledDebug) return;
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...metadata,
  };
  const method = level === "warn" ? console.warn : level === "error" ? console.error : console.info;
  method(JSON.stringify(payload));
}

export const logger = {
  debug: (event: string, metadata?: LogMetadata) => write("debug", event, metadata),
  info: (event: string, metadata?: LogMetadata) => write("info", event, metadata),
  warn: (event: string, metadata?: LogMetadata) => write("warn", event, metadata),
  error: (event: string, metadata?: LogMetadata) => write("error", event, metadata),
};
