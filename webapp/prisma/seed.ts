import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const lanePasswordHash = await bcrypt.hash('savage-wins-2026', 12);
  const marizPasswordHash = await bcrypt.hash('scg-mariz-2026', 12);

  await prisma.user.upsert({
    where: { email: 'lane@swainston.com' },
    update: { passwordHash: lanePasswordHash, name: 'Lane Swainston', role: 'admin' },
    create: { name: 'Lane Swainston', email: 'lane@swainston.com', passwordHash: lanePasswordHash, role: 'admin' },
  });

  await prisma.user.upsert({
    where: { email: 'mariz@swainston.com' },
    update: { passwordHash: marizPasswordHash, name: 'Mariz Arellano', role: 'consultant' },
    create: { name: 'Mariz Arellano', email: 'mariz@swainston.com', passwordHash: marizPasswordHash, role: 'consultant' },
  });

  console.log('✓ lane@swainston.com (admin)');
  console.log('✓ mariz@swainston.com (consultant)');
}

main().catch(console.error).finally(() => prisma.$disconnect());
