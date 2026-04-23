const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

const configuredLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) in LOG_LEVELS
    ? (process.env.LOG_LEVEL as LogLevel)
    : 'info';

const isProduction = process.env.NODE_ENV === 'production';

// ANSI color codes for dev output
const COLORS: Record<LogLevel | 'audit', string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
  audit: '\x1b[35m', // magenta
};
const RESET = '\x1b[0m';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[configuredLevel];
}

function formatContext(context: Record<string, unknown> | undefined): string {
  if (!context || Object.keys(context).length === 0) return '';
  return ' ' + JSON.stringify(context);
}

function write(
  level: LogLevel | 'audit',
  message: string,
  context?: Record<string, unknown>,
  extraFields?: Record<string, unknown>,
): void {
  const timestamp = new Date().toISOString();

  if (isProduction) {
    const entry = {
      timestamp,
      level,
      service: 'blackbar',
      message,
      ...extraFields,
      ...context,
    };
    process.stdout.write(JSON.stringify(entry) + '\n');
  } else {
    const color = COLORS[level] || '';
    const tag = level.toUpperCase().padEnd(5);
    const ctx = formatContext(context);
    const extra = extraFields ? ' ' + JSON.stringify(extraFields) : '';
    process.stdout.write(
      `${color}[${timestamp}] ${tag}${RESET} ${message}${ctx}${extra}\n`,
    );
  }
}

export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
  audit(message: string, context?: Record<string, unknown>): void;
}

function createLoggerInstance(
  boundContext?: Record<string, unknown>,
): Logger {
  function mergeContext(
    extra?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (!boundContext && !extra) return undefined;
    if (!boundContext) return extra;
    if (!extra) return boundContext;
    return { ...boundContext, ...extra };
  }

  return {
    info(message: string, context?: Record<string, unknown>): void {
      if (shouldLog('info')) write('info', message, mergeContext(context));
    },
    warn(message: string, context?: Record<string, unknown>): void {
      if (shouldLog('warn')) write('warn', message, mergeContext(context));
    },
    error(message: string, context?: Record<string, unknown>): void {
      if (shouldLog('error')) write('error', message, mergeContext(context));
    },
    debug(message: string, context?: Record<string, unknown>): void {
      if (shouldLog('debug')) write('debug', message, mergeContext(context));
    },
    audit(message: string, context?: Record<string, unknown>): void {
      // audit always writes regardless of log level
      write('audit', message, mergeContext(context), { audit: true });
    },
  };
}

export const logger: Logger = createLoggerInstance();

export function createChildLogger(
  context: Record<string, unknown>,
): Logger {
  return createLoggerInstance(context);
}
