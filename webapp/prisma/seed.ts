/**
 * BlackBar — Database Seed
 *
 * Idempotent. Safe to run on every deploy or never.
 * Reads passwords from env (SEED_LANE_PASSWORD, SEED_MARIZ_PASSWORD) so secrets
 * stay out of the repo. Falls back to a placeholder in non-production envs so
 * `npm run db:seed` works locally without env-var setup; throws in production.
 *
 * Run:  npm run db:seed   (from webapp/)
 * Reset and re-seed: npm run db:migrate:reset
 */
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PLACEHOLDER_PASSWORD = 'CHANGE-ME-NOT-FOR-PROD';

function passwordOrThrow(envVar: string, label: string): string {
  const value = process.env[envVar];
  if (value && value.length >= 8) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `[seed] Refusing to seed ${label} in production without ${envVar} set (min 8 chars).`,
    );
  }
  console.warn(
    `[seed] ${envVar} not set — using placeholder for ${label}. Do NOT use this build in production.`,
  );
  return PLACEHOLDER_PASSWORD;
}

async function upsertUser(opts: {
  email: string;
  legacyEmail?: string;
  name: string;
  role: UserRole;
  passwordHash: string;
}) {
  // Migrate any legacy-email user to the canonical email so we don't end up
  // with two rows after the spec change. One-time housekeeping; safe to leave in.
  if (opts.legacyEmail) {
    const legacy = await prisma.user.findUnique({ where: { email: opts.legacyEmail } });
    if (legacy) {
      await prisma.user.update({
        where: { id: legacy.id },
        data: {
          email: opts.email,
          name: opts.name,
          role: opts.role,
          passwordHash: opts.passwordHash,
        },
      });
      console.log(`✓ migrated ${opts.legacyEmail} → ${opts.email} (${opts.role})`);
      return;
    }
  }

  await prisma.user.upsert({
    where: { email: opts.email },
    update: {
      name: opts.name,
      role: opts.role,
      passwordHash: opts.passwordHash,
    },
    create: {
      email: opts.email,
      name: opts.name,
      role: opts.role,
      passwordHash: opts.passwordHash,
    },
  });
  console.log(`✓ ${opts.email} (${opts.role})`);
}

async function main() {
  const lanePassword = passwordOrThrow('SEED_LANE_PASSWORD', 'Lane');
  const marizPassword = passwordOrThrow('SEED_MARIZ_PASSWORD', 'Mariz');

  const [laneHash, marizHash] = await Promise.all([
    bcrypt.hash(lanePassword, 12),
    bcrypt.hash(marizPassword, 12),
  ]);

  await upsertUser({
    email: 'lane@swainstonconsulting.com',
    legacyEmail: 'lane@swainston.com',
    name: 'Lane Swainston',
    role: UserRole.expert,
    passwordHash: laneHash,
  });

  await upsertUser({
    email: 'mariz@swainstonconsulting.com',
    legacyEmail: 'mariz@swainston.com',
    name: 'Mariz Arellano',
    role: UserRole.expert,
    passwordHash: marizHash,
  });

  console.log('');
  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
