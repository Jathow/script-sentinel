import { logManager } from './logger';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function levelToPriority(level: LogLevel): number {
  switch (level) {
    case 'debug':
      return 10;
    case 'info':
      return 20;
    case 'warn':
      return 30;
    case 'error':
      return 40;
    default:
      return 20;
  }
}

let currentLevel: LogLevel = (process.env.APP_LOG_LEVEL as LogLevel) || 'info';

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (levelToPriority(level) < levelToPriority(currentLevel)) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    src: 'main',
    message,
    ...(meta ? { meta } : {}),
  };
  logManager.write('app', JSON.stringify(entry) + '\n');
}

export const logger = {
  setLevel: setLogLevel,
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
};


