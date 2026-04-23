import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// --- Constants ---

export const ACCESS_TOKEN_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY_DAYS = 30;

// --- JWT Secret ---

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;

// --- Types ---

export interface TokenPayload {
  userId: string;
  orgId?: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

// --- Token Generation ---

/**
 * Generate a short-lived JWT access token (15 min).
 */
export function generateAccessToken(userId: string, orgId?: string): string {
  const payload: Pick<TokenPayload, 'userId' | 'orgId' | 'type'> = {
    userId,
    type: 'access',
  };
  if (orgId) {
    payload.orgId = orgId;
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Generate a cryptographically random refresh token (64-byte hex string).
 * This raw value is returned to the client; only its hash should be stored.
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

// --- Token Hashing ---

/**
 * SHA-256 hash a token for safe database storage.
 * Raw refresh tokens must never be persisted.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// --- Token Verification ---

/**
 * Verify and decode a JWT access token.
 * Returns the decoded payload on success, or null on any failure
 * (expired, malformed, wrong signature, etc.).
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}
