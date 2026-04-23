import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_EXPIRY_DAYS,
} from '../lib/auth.js';

const router = Router();

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------

/** 5 login attempts per IP per 15 minutes */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** 30 refresh attempts per IP per 15 minutes */
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many refresh attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

const COOKIE_NAME = 'bb_refresh';

function refreshCookieOptions(maxAgeDays: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/auth',
    maxAge: maxAgeDays * 24 * 60 * 60 * 1000,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;

/**
 * Resolve the primary orgId for a user (first membership).
 * Returns undefined when the user has no org memberships.
 */
async function getPrimaryOrgId(userId: string): Promise<string | undefined> {
  try {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { orgId: true },
    });
    return membership?.orgId ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Store a hashed refresh token in the database.
 */
async function persistRefreshToken(userId: string, rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });
}

// ---------------------------------------------------------------------------
// POST /login
// ---------------------------------------------------------------------------

router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Valid email and password required' });
    return;
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // --- Account lock check ---
  try {
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60_000,
      );
      res.status(423).json({
        error: `Account locked. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`,
      });
      return;
    }
  } catch {
    // lockedUntil field may not exist yet — proceed without lock check
  }

  // --- Password verification ---
  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    // Increment failed attempts & possibly lock
    try {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      const updateData: Record<string, unknown> = { failedLoginAttempts: attempts };
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      }
      await prisma.user.update({ where: { id: user.id }, data: updateData });
    } catch {
      // Fields may not exist yet — ignore
    }
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // --- Successful login ---

  // Reset failed attempts + record login time
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });
  } catch {
    // Fields may not exist yet — non-critical
  }

  const orgId = await getPrimaryOrgId(user.id);
  const accessToken = generateAccessToken(user.id, orgId);
  const refreshToken = generateRefreshToken();

  await persistRefreshToken(user.id, refreshToken);

  // Set refresh token as httpOnly cookie
  res.cookie(COOKIE_NAME, refreshToken, refreshCookieOptions(REFRESH_TOKEN_EXPIRY_DAYS));

  res.json({
    token: accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, role: user.role },
  });
});

// ---------------------------------------------------------------------------
// POST /refresh
// ---------------------------------------------------------------------------

router.post('/refresh', refreshLimiter, async (req: Request, res: Response) => {
  // Accept from body or cookie
  const parsed = refreshSchema.safeParse(req.body);
  const rawToken =
    parsed.success && parsed.data.refreshToken
      ? parsed.data.refreshToken
      : (req.cookies?.[COOKIE_NAME] as string | undefined);

  if (!rawToken) {
    res.status(400).json({ error: 'Refresh token required' });
    return;
  }

  const tokenHash = hashToken(rawToken);

  // Lookup stored token
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!storedToken) {
    res.status(401).json({ error: 'Invalid refresh token' });
    return;
  }

  // Check revoked
  if (storedToken.revokedAt) {
    // Potential token reuse attack — revoke entire family
    try {
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // best-effort
    }
    res.status(401).json({ error: 'Refresh token revoked' });
    return;
  }

  // Check expired
  if (storedToken.expiresAt < new Date()) {
    // Revoke the expired token for hygiene
    try {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });
    } catch {
      // best-effort
    }
    res.status(401).json({ error: 'Refresh token expired' });
    return;
  }

  // --- Rotate: revoke old, issue new ---
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  const orgId = await getPrimaryOrgId(storedToken.userId);
  const newAccessToken = generateAccessToken(storedToken.userId, orgId);
  const newRefreshToken = generateRefreshToken();

  await persistRefreshToken(storedToken.userId, newRefreshToken);

  res.cookie(COOKIE_NAME, newRefreshToken, refreshCookieOptions(REFRESH_TOKEN_EXPIRY_DAYS));

  res.json({
    token: newAccessToken,
    refreshToken: newRefreshToken,
  });
});

// ---------------------------------------------------------------------------
// POST /logout
// ---------------------------------------------------------------------------

router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
  // Revoke all refresh tokens for this user
  await prisma.refreshToken.updateMany({
    where: { userId: req.userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  // Clear the refresh cookie
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/auth',
  });

  res.json({ message: 'Logged out' });
});

// ---------------------------------------------------------------------------
// GET /me
// ---------------------------------------------------------------------------

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ id: user.id, name: user.name, role: user.role, email: user.email });
});

export default router;
