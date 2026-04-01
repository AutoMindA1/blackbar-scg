import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const reports = await prisma.report.findMany();
  
  reports.forEach(r => {
    console.log('\nReport ' + r.id);
    console.log('content length:', r.content?.length);
    console.log('sections type:', typeof r.sections);
    console.log('sections value:', JSON.stringify(r.sections, null, 2).substring(0, 300));
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
