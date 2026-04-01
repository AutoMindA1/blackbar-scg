import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const cases = await prisma.case.findMany({
      where: {
        id: {
          in: ['case_gleason', 'case_heagy', 'case_anderson']
        }
      },
      include: { documents: true, agentLogs: true, report: true, creator: true }
    });
    
    console.log('Found ' + cases.length + ' cases');
    cases.forEach(c => {
      console.log('\n' + c.id + ': ' + c.name);
      console.log('  - createdBy: ' + c.createdBy);
      console.log('  - creator email: ' + (c.creator?.email || 'NULL'));
      console.log('  - documents: ' + c.documents.length);
      console.log('  - agentLogs: ' + c.agentLogs.length);
      console.log('  - report: ' + (c.report ? 'YES' : 'NO'));
    });
  } catch(e) {
    console.error('DB Error:', e instanceof Error ? e.message : String(e));
  }
}

main().finally(() => prisma.$disconnect());
