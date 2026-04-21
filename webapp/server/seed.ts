import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Seed users
  const lane = await prisma.user.upsert({
    where: { email: 'lane@swainston.com' },
    update: {},
    create: {
      id: 'usr_lane',
      name: 'Lane Swainston',
      email: 'lane@swainston.com',
      passwordHash: await bcrypt.hash('savage-wins-2026', 12),
      role: UserRole.expert,
    },
  });

  const mariz = await prisma.user.upsert({
    where: { email: 'mariz@swainston.com' },
    update: {},
    create: {
      id: 'usr_mariz',
      name: 'Mariz Arellano',
      email: 'mariz@swainston.com',
      passwordHash: await bcrypt.hash('scg-mariz-2026', 12),
      role: UserRole.expert,
    },
  });

  // Seed 3 benchmark cases
  const gleason = await prisma.case.upsert({
    where: { id: 'case_gleason' },
    update: {},
    create: {
      id: 'case_gleason',
      name: 'NP Santa Fe, LLC adv Gleason',
      caseType: 'slip_fall',
      reportType: 'initial',
      jurisdiction: 'Clark County, Nevada',
      opposingExpert: 'John Peterson',
      stage: 'qa',
      createdBy: lane.id,
      deadline: new Date('2026-04-15'),
    },
  });

  const heagy = await prisma.case.upsert({
    where: { id: 'case_heagy' },
    update: {},
    create: {
      id: 'case_heagy',
      name: 'Clark County DoA dba Harry Reid Int\'l Airport adv Heagy',
      caseType: 'slip_fall',
      reportType: 'rebuttal',
      jurisdiction: 'Clark County, Nevada',
      opposingExpert: 'John Peterson',
      stage: 'drafting',
      createdBy: lane.id,
      deadline: new Date('2026-04-20'),
    },
  });

  const anderson = await prisma.case.upsert({
    where: { id: 'case_anderson' },
    update: {},
    create: {
      id: 'case_anderson',
      name: 'Santa Fe Station Hotel and Casino adv Anderson',
      caseType: 'slip_fall',
      reportType: 'supplemental',
      jurisdiction: 'Clark County, Nevada',
      opposingExpert: 'John Peterson',
      stage: 'export',
      createdBy: lane.id,
      deadline: new Date('2026-03-30'),
    },
  });

  // Seed documents for each case
  await prisma.document.createMany({
    skipDuplicates: true,
    data: [
      { id: 'doc_gl1', caseId: gleason.id, filename: 'SCG Report - Gleason.pdf', filepath: '/uploads/gleason-report.pdf', sizeBytes: 2048000, pageCount: 20 },
      { id: 'doc_gl2', caseId: gleason.id, filename: 'Plaintiff Deposition - Gleason.pdf', filepath: '/uploads/gleason-depo.pdf', sizeBytes: 512000, pageCount: 45 },
      { id: 'doc_hg1', caseId: heagy.id, filename: 'SCG Rebuttal Report - Heagy.pdf', filepath: '/uploads/heagy-rebuttal.pdf', sizeBytes: 1536000, pageCount: 14 },
      { id: 'doc_hg2', caseId: heagy.id, filename: 'Peterson Expert Report - Heagy.pdf', filepath: '/uploads/heagy-peterson.pdf', sizeBytes: 768000, pageCount: 22 },
      { id: 'doc_an1', caseId: anderson.id, filename: 'SCG Supplemental Report - Anderson.pdf', filepath: '/uploads/anderson-supp.pdf', sizeBytes: 1792000, pageCount: 18 },
      { id: 'doc_an2', caseId: anderson.id, filename: 'ANSI A326.3 Standard.pdf', filepath: '/uploads/ansi-a326.pdf', sizeBytes: 384000, pageCount: 12 },
    ],
  });

  // Seed agent logs
  await prisma.agentLog.createMany({
    skipDuplicates: true,
    data: [
      { caseId: gleason.id, stage: 'intake', type: 'complete', message: 'Intake complete — slip_fall classified, Clark County jurisdiction confirmed' },
      { caseId: gleason.id, stage: 'research', type: 'complete', message: 'Research complete — ATK-01 credential attack matched (Peterson CXLT expired), ATK-07 omission attack identified' },
      { caseId: gleason.id, stage: 'research', type: 'finding', message: 'Peterson CXLT certification EXPIRED — registry checked 15 March 2026', metadata: { attackPattern: 'ATK-01', confidence: 0.95 } },
      { caseId: gleason.id, stage: 'drafting', type: 'complete', message: 'Draft complete — 7 sections, BLK-01 multi-factor opener inserted, BLK-02 XL VIT reliability block inserted' },
      { caseId: gleason.id, stage: 'qa', type: 'progress', message: 'QA in progress — scanning for prohibited terms per Brain §5' },
      { caseId: heagy.id, stage: 'intake', type: 'complete', message: 'Intake complete — rebuttal report, airport operations context' },
      { caseId: heagy.id, stage: 'research', type: 'complete', message: 'Research complete — ATK-07 omission attack (sharpest application), ATK-05 outside-their-lane matched' },
      { caseId: heagy.id, stage: 'drafting', type: 'progress', message: 'Drafting Agent inserted BLK-11 (no site visit dismissal)' },
      { caseId: anderson.id, stage: 'intake', type: 'complete', message: 'Intake complete — supplemental report, full Peterson playbook expected' },
      { caseId: anderson.id, stage: 'research', type: 'complete', message: 'Research complete — ATK-08 instrumentation defense, full ANSI A326.3 / BOT-3000E analysis' },
      { caseId: anderson.id, stage: 'drafting', type: 'complete', message: 'Draft complete — BLK-08 BOT-3000E block, BLK-09 ANSI A326.3 defense inserted' },
      { caseId: anderson.id, stage: 'qa', type: 'complete', message: 'QA passed — 96/100, zero prohibited terms, entity voice consistent, European dates confirmed' },
    ],
  });

  // Seed reports for cases past drafting
  await prisma.report.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'rpt_gleason',
        caseId: gleason.id,
        content: `<h2>Qualifications</h2><p>Lane Swainston is a Certified Building Official (CBO) with the International Code Council (ICC), a position he has held since 1987. He holds additional certifications as a Certified XL Tribometrist (CXLT) through Excel Tribometers, LLC, and as a Walkway Safety Auditor (ASTM F2948-13) through the University of North Texas.</p><h2>Documentation Reviewed</h2><p>The following documents were provided by your office or research reviewed by SCG in preparation for this Report:</p><ul><li>Plaintiff Deposition Transcript of Gleason dated 15 November 2025;</li><li>SCG Site Visit Photos &amp; Videos dated 2 February 2026.</li></ul><h2>Date &amp; Location of Alleged Accident</h2><p>2 February 2026 — NP Santa Fe, LLC, Clark County, Nevada.</p><h2>Alleged Accident Details</h2><p>The Plaintiff allegedly slipped and fell on the subject incident floor. SCG Personnel visited the subject premises to observe and document the current conditions of the subject incident area.</p><h2>Points of Opinion</h2><p>The opinions expressed in this section are based on our review of the available records, photographs, videos, and witness statements, as well as our analysis of the subject incident area and relevant standards.</p><p>The possibility of a slip occurring on a surface can be due to many factors, including the material on a pedestrian's foot, the presence and nature of surface contaminants, the pedestrian walking speed and gait, the pedestrian payment of attention, any physical or mental impairment of the individual, the level or slope of the surface, and how the surface is structured, intended to be used, and maintained. SCG considered all these factors as part of our analysis of the Plaintiff's alleged accident.</p><h2>Conclusion</h2><p>SCG holds these opinions with a reasonable degree of professional certainty, based on our education and experience in quality control, design, walkway safety, venue operations, and code compliance. This Report, including any opinions contained herein, is based upon a reasonable degree of scientific probability and our investigation of the information provided.</p>`,
        sections: [
          { title: 'Qualifications', order: 1 },
          { title: 'Documentation Reviewed', order: 2 },
          { title: 'Date & Location of Alleged Accident', order: 3 },
          { title: 'Alleged Accident Details', order: 4 },
          { title: 'Points of Opinion', order: 5 },
          { title: 'Conclusion', order: 6 },
        ],
        version: 2,
      },
      {
        id: 'rpt_anderson',
        caseId: anderson.id,
        content: `<h2>Additional Documentation Reviewed</h2><p>The following additional documents were provided by your office or researched by SCG in the preparation of this Report:</p><ul><li>Plaintiff Expert Report written by John Peterson of Retail Litigation Consultants dated 15 October 2025;</li><li>ANSI A326.3 Standard;</li><li>SCG Research: NFSI B101.1 and B101.3 threshold analysis.</li></ul><h2>Supplemental Points of Opinion</h2><p>The BOT-3000E is a digital, automated tribometer specifically designed to measure both static and dynamic coefficient of friction on walkway surfaces in the lab and in the field. It performs tests electronically with no human input other than placing the device and pressing the start button, thereby minimizing the risk of operator manipulation. It is the only device named in ANSI A326.3, and it was validated to ASTM F2508 for use as a walkway tribometer.</p><p>ANSI A326.3 is the only nationally published standard that provides a defined test method, calibration requirements, equipment specifications, and performance thresholds for hard-surface flooring materials.</p><h2>Conclusion</h2><p>SCG holds these opinions with a reasonable degree of professional certainty, based on our education and experience in quality control, design, walkway safety, venue operations, and code compliance.</p>`,
        sections: [
          { title: 'Additional Documentation Reviewed', order: 1 },
          { title: 'Supplemental Points of Opinion', order: 2 },
          { title: 'Conclusion', order: 3 },
        ],
        version: 3,
      },
    ],
  });

  console.log('Seeded:', { users: [lane.id, mariz.id], cases: [gleason.id, heagy.id, anderson.id] });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
