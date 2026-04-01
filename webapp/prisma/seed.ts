import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('savage-wins-2026', 12);

  await prisma.user.upsert({
    where: { email: 'lane@swainston.com' },
    update: { passwordHash, name: 'Lane Swainston', role: 'admin' },
    create: { name: 'Lane Swainston', email: 'lane@swainston.com', passwordHash, role: 'admin' },
  });

  await prisma.user.upsert({
    where: { email: 'mariz@swainston.com' },
    update: { passwordHash, name: 'Mariz Arellano', role: 'operator' },
    create: { name: 'Mariz Arellano', email: 'mariz@swainston.com', passwordHash, role: 'operator' },
  });

  console.log('✓ lane@swainston.com (admin)');
  console.log('✓ mariz@swainston.com (operator)');
}

main().catch(console.error).finally(() => prisma.$disconnect());
