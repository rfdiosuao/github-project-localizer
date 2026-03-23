/**
 * 简单的日志工具
 * 输出 JSON 格式的结构化日志
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  msg: string;
  ts: string;
  error?: string;
  stack?: string;
  [key: string]: unknown;
}

function formatLog(level: LogLevel, msg: string, meta?: Record<string, unknown>): string {
  const entry: LogEntry = {
    level,
    msg,
    ts: new Date().toISOString(),
    ...meta
  };
  return JSON.stringify(entry);
}

function formatErrorLog(level: LogLevel, msg: string, error?: Error, meta?: Record<string, unknown>): string {
  const entry: LogEntry = {
    level,
    msg,
    ts: new Date().toISOString(),
    error: error?.message,
    stack: error?.stack,
    ...meta
  };
  return JSON.stringify(entry);
}

export const logger = {
  debug(msg: string, meta?: Record<string, unknown>): void {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(formatLog('debug', msg, meta));
    }
  },

  info(msg: string, meta?: Record<string, unknown>): void {
    console.log(formatLog('info', msg, meta));
  },

  warn(msg: string, meta?: Record<string, unknown>): void {
    console.warn(formatLog('warn', msg, meta));
  },

  error(msg: string, error?: Error, meta?: Record<string, unknown>): void {
    console.error(formatErrorLog('error', msg, error, meta));
  }
};

export default logger;