/**
 * Global test setup — runs before all test files.
 * Sets required env vars that would normally come from .env
 */

process.env.JWT_SECRET = 'test-jwt-secret-do-not-use-in-production';
process.env.ANTHROPIC_API_KEY = 'test-key-not-real';
process.env.NODE_ENV = 'test';
