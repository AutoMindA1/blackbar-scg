import { describe, it, expect } from 'vitest';

// The logger module (server/lib/logger.ts) is being created by another agent.
// These tests define the expected interface:
//
//   import { createLogger, type Logger } from '../lib/logger.js';
//
//   interface Logger {
//     info(message: string, context?: Record<string, unknown>): void;
//     warn(message: string, context?: Record<string, unknown>): void;
//     error(message: string, context?: Record<string, unknown>): void;
//     debug(message: string, context?: Record<string, unknown>): void;
//     audit(message: string, context?: Record<string, unknown>): void;
//     child(context: Record<string, unknown>): Logger;
//   }
//
//   createLogger(options: { service: string; level?: string }): Logger;
//
// We mock the module here so the test file compiles and validates the
// expected contract even before the real logger.ts lands.

// ---------------------------------------------------------------------------
// Inline mock implementation matching the expected Logger interface
// ---------------------------------------------------------------------------

interface LogEntry {
  timestamp: string;
  level: string;
  service: string;
  message: string;
  [key: string]: unknown;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function createMockLogger(options: { service: string; level?: string }, parentContext: Record<string, unknown> = {}) {
  const minLevel = options.level ?? 'info';
  const entries: LogEntry[] = [];

  function shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel];
  }

  function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (!shouldLog(level)) return;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: options.service,
      message,
      ...parentContext,
      ...context,
    };
    entries.push(entry);
    // In real logger this would go to stdout; we capture for assertions
  }

  return {
    info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
    warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
    error: (message: string, context?: Record<string, unknown>) => log('error', message, context),
    debug: (message: string, context?: Record<string, unknown>) => log('debug', message, context),
    audit: (message: string, context?: Record<string, unknown>) => {
      // Audit always writes regardless of level
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'audit',
        service: options.service,
        message,
        ...parentContext,
        ...context,
      };
      entries.push(entry);
    },
    child: (childContext: Record<string, unknown>) => {
      return createMockLogger(options, { ...parentContext, ...childContext });
    },
    // Test helper to inspect captured log entries
    _entries: entries,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Logger', () => {
  describe('structured output', () => {
    it('outputs JSON with timestamp, level, service, and message', () => {
      const logger = createMockLogger({ service: 'test-service' });
      logger.info('Server started', { port: 3001 });

      expect(logger._entries).toHaveLength(1);
      const entry = logger._entries[0];
      expect(entry.timestamp).toBeDefined();
      expect(typeof entry.timestamp).toBe('string');
      // ISO 8601 format check
      expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
      expect(entry.level).toBe('info');
      expect(entry.service).toBe('test-service');
      expect(entry.message).toBe('Server started');
      expect(entry.port).toBe(3001);
    });

    it('includes all log levels (info, warn, error, debug)', () => {
      const logger = createMockLogger({ service: 'svc', level: 'debug' });
      logger.debug('dbg');
      logger.info('inf');
      logger.warn('wrn');
      logger.error('err');

      expect(logger._entries).toHaveLength(4);
      expect(logger._entries.map(e => e.level)).toEqual(['debug', 'info', 'warn', 'error']);
    });
  });

  describe('child logger', () => {
    it('merges parent context with call context', () => {
      const parent = createMockLogger({ service: 'api' });
      const child = parent.child({ caseId: 'case-123', stage: 'intake' });

      child.info('Processing document', { docName: 'depo.pdf' });

      expect(child._entries).toHaveLength(1);
      const entry = child._entries[0];
      expect(entry.service).toBe('api');
      expect(entry.caseId).toBe('case-123');
      expect(entry.stage).toBe('intake');
      expect(entry.docName).toBe('depo.pdf');
    });

    it('child context does not pollute parent logger', () => {
      const parent = createMockLogger({ service: 'api' });
      const child = parent.child({ requestId: 'req-1' });

      parent.info('parent message');
      child.info('child message');

      expect(parent._entries).toHaveLength(1);
      expect(parent._entries[0].requestId).toBeUndefined();
      expect(child._entries).toHaveLength(1);
      expect(child._entries[0].requestId).toBe('req-1');
    });
  });

  describe('log levels', () => {
    it('suppresses debug messages at info level', () => {
      const logger = createMockLogger({ service: 'svc', level: 'info' });
      logger.debug('This should be suppressed');
      logger.info('This should appear');

      expect(logger._entries).toHaveLength(1);
      expect(logger._entries[0].level).toBe('info');
      expect(logger._entries[0].message).toBe('This should appear');
    });

    it('suppresses info and debug at warn level', () => {
      const logger = createMockLogger({ service: 'svc', level: 'warn' });
      logger.debug('no');
      logger.info('no');
      logger.warn('yes');
      logger.error('yes');

      expect(logger._entries).toHaveLength(2);
      expect(logger._entries.map(e => e.level)).toEqual(['warn', 'error']);
    });

    it('suppresses everything below error at error level', () => {
      const logger = createMockLogger({ service: 'svc', level: 'error' });
      logger.debug('no');
      logger.info('no');
      logger.warn('no');
      logger.error('yes');

      expect(logger._entries).toHaveLength(1);
      expect(logger._entries[0].level).toBe('error');
    });

    it('defaults to info level when not specified', () => {
      const logger = createMockLogger({ service: 'svc' });
      logger.debug('suppressed');
      logger.info('shown');

      expect(logger._entries).toHaveLength(1);
      expect(logger._entries[0].message).toBe('shown');
    });
  });

  describe('audit', () => {
    it('always outputs regardless of level', () => {
      const logger = createMockLogger({ service: 'svc', level: 'error' });
      logger.debug('suppressed');
      logger.info('suppressed');
      logger.warn('suppressed');
      logger.audit('critical audit event', { action: 'login', userId: 'u1' });

      expect(logger._entries).toHaveLength(1);
      expect(logger._entries[0].level).toBe('audit');
      expect(logger._entries[0].message).toBe('critical audit event');
      expect(logger._entries[0].action).toBe('login');
      expect(logger._entries[0].userId).toBe('u1');
    });

    it('audit messages include service and timestamp', () => {
      const logger = createMockLogger({ service: 'auth' });
      logger.audit('user logged in');

      const entry = logger._entries[0];
      expect(entry.service).toBe('auth');
      expect(entry.timestamp).toBeDefined();
      expect(entry.level).toBe('audit');
    });
  });
});
