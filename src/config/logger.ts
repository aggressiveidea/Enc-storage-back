import { env } from "./env";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  [key: string]: unknown;
}

class Logger {
  private format(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    };

    if (env.NODE_ENV === "production") {
      return JSON.stringify(entry);
    }

    const levelColor: Record<LogLevel, string> = {
      info: "\x1b[36m",
      warn: "\x1b[33m",
      error: "\x1b[31m",
      debug: "\x1b[35m",
    };
    const reset = "\x1b[0m";
    const prefix = `${levelColor[level]}[${level.toUpperCase()}]${reset}`;
    const cid = entry.correlationId ? ` [${entry.correlationId}]` : "";
    const extra = meta
      ? ` ${Object.entries(meta)
          .filter(([k]) => k !== "correlationId")
          .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
          .join(" ")}`
      : "";
    return `${entry.timestamp} ${prefix}${cid} ${message}${extra}`;
  }

  info(message: string, meta?: Record<string, unknown>) {
    console.log(this.format("info", message, meta));
  }

  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(this.format("warn", message, meta));
  }

  error(message: string, meta?: Record<string, unknown>) {
    console.error(this.format("error", message, meta));
  }

  debug(message: string, meta?: Record<string, unknown>) {
    if (env.NODE_ENV !== "production") {
      console.debug(this.format("debug", message, meta));
    }
  }
}

export const logger = new Logger();
