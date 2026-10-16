import { PrismaClient, ContributionStatus } from '@prisma/client';

const prisma = new PrismaClient();

function formatDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : ' '.repeat(len - str.length) + str;
}

async function checkDatabase() {
  console.log('\n========================================================================================');
  console.log('                          CAMPAIGNS DATABASE INTEGRITY CHECK                            ');
  console.log('========================================================================================\n');

  const campaigns = await prisma.campaign.findMany({
    include: {
      contributions: {
        where: { status: ContributionStatus.SUCCEEDED },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (campaigns.length === 0) {
    console.error('❌ Error: No campaigns found in database! Did you run npm run db:seed?');
    process.exit(1);
  }

  let totalRaised = 0;
  let totalGoal = 0;
  let totalContributions = 0;
  let hasMismatch = false;

  const colTitle = 38;
  const colCat = 16;
  const colStatus = 18;
  const colRaised = 11;
  const colGoal = 11;
  const colPct = 8;
  const colCount = 8;
  const colMatch = 8;

  const header = `${padRight('Title', colTitle)} | ${padRight('Category', colCat)} | ${padRight('Status', colStatus)} | ${padLeft('Raised', colRaised)} | ${padLeft('Goal', colGoal)} | ${padLeft('% Funded', colPct)} | ${padLeft('Count', colCount)} | ${padRight('Ledger', colMatch)}`;
  const divider = '-'.repeat(header.length);

  console.log(header);
  console.log(divider);

  for (const c of campaigns) {
    const contributionSum = c.contributions.reduce((acc, curr) => acc + curr.amountCents, 0);
    const percent = c.fundingGoalCents > 0 ? ((c.raisedCents / c.fundingGoalCents) * 100).toFixed(1) + '%' : '0.0%';
    const isMatch = contributionSum === c.raisedCents;

    if (!isMatch) {
      hasMismatch = true;
    }

    totalRaised += c.raisedCents;
    totalGoal += c.fundingGoalCents;
    totalContributions += c.contributions.length;

    const row = `${padRight(c.title, colTitle)} | ${padRight(c.category, colCat)} | ${padRight(c.status, colStatus)} | ${padLeft(formatDollars(c.raisedCents), colRaised)} | ${padLeft(formatDollars(c.fundingGoalCents), colGoal)} | ${padLeft(percent, colPct)} | ${padLeft(String(c.contributions.length), colCount)} | ${padRight(isMatch ? '✓ OK' : '✗ FAIL', colMatch)}`;
    console.log(row);
  }

  console.log(divider);
  const totalPercent = totalGoal > 0 ? ((totalRaised / totalGoal) * 100).toFixed(1) + '%' : '0.0%';
  const summaryRow = `${padRight(`TOTALS (${campaigns.length} campaigns)`, colTitle)} | ${padRight('-', colCat)} | ${padRight('-', colStatus)} | ${padLeft(formatDollars(totalRaised), colRaised)} | ${padLeft(formatDollars(totalGoal), colGoal)} | ${padLeft(totalPercent, colPct)} | ${padLeft(String(totalContributions), colCount)} | ${padRight(hasMismatch ? '✗ FAIL' : '✓ OK', colMatch)}`;
  console.log(summaryRow);
  console.log('========================================================================================\n');

  if (hasMismatch) {
    console.error('❌ LEDGER MISMATCH DETECTED: One or more campaigns have raisedCents != sum(succeeded contributions).');
    process.exit(1);
  }

  console.log('✅ All campaigns passed integrity check! Every raisedCents mathematically matches its succeeded contributions.\n');
}

checkDatabase()
  .catch((err) => {
    console.error('Check failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
