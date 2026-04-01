import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Simulate what the GET /api/cases/:id endpoint returns
  const c = await prisma.case.findUnique({
    where: { id: 'case_gleason' },
    include: { documents: true, agentLogs: { orderBy: { createdAt: 'desc' }, take: 50 }, report: true },
  });
  
  if (!c) {
    console.log('Case not found!');
    return;
  }
  
  console.log('API Response:');
  console.log('id:', c.id);
  console.log('name:', c.name);
  console.log('createdBy:', c.createdBy);
  console.log('creator field present in response?', 'creator' in c);
  console.log('Number of documents:', c.documents.length);
  console.log('Number of agentLogs:', c.agentLogs.length);
  console.log('Report:', c.report ? 'YES' : 'NO');
  console.log('\nFull response:', JSON.stringify(c, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
