// Lightweight dependency-free logger.
// NOTE: this previously imported `pino`, which was never added to
// package.json/installed, breaking `npm run build`. Swapped for a
// zero-dependency console wrapper with the same basic level API.
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const LEVEL = (process.env.LOG_LEVEL ?? 'info') as LogLevel;

function log(level: LogLevel, ...args: unknown[]) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level.toUpperCase()}]`;
  if (level === 'error') console.error(line, ...args);
  else if (level === 'warn') console.warn(line, ...args);
  else console.log(line, ...args);
}

export const logger = {
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args),
  debug: (...args: unknown[]) => (LEVEL === 'debug' ? log('debug', ...args) : undefined),
};
