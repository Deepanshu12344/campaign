/**
 * End-to-End Production User Journey QA Script
 *
 * Verifies against the live production deployment:
 * 1. Guest Discovery
 * 2. Creator Registration & Draft Initialization (Goal strictly isolated to Step 5)
 * 3. 5-Step Creation & Autosave
 * 4. Campaign Submission with mandatory acceptedRules gate
 * 5. Admin Review Queue & Approval (SUBMITTED -> APPROVED -> FUNDING)
 * 6. Backer Registration & Login
 * 7. Simulated Payment Rejection (Magic Card ...0002)
 * 8. Simulated Payment Success (Magic Card 4242..., $50.00)
 * 9. Idempotency & Receipt Generation (REC-XXXXX)
 * 10. Ledger and Metric Consistency Check
 * 11. Post-Funding Lifecycle Progression:
 *     FUNDING -> FUNDING_CLOSED (funding goal reached does NOT auto-promote)
 *     FUNDING_CLOSED -> DISTRIBUTION_PREP
 *     DISTRIBUTION_PREP -> PROMOTING
 *     PROMOTING -> COMPLETED
 *
 * Usage:
 *   npx tsx scripts/qa-journey.ts
 */

const rawBase = (process.env.API_URL || 'https://campaign-admj.onrender.com').replace(/\/$/, '');
const BASE_URL = rawBase.endsWith('/api/v1') ? rawBase : `${rawBase}/api/v1`;

function logStep(step: number, title: string) {
  console.log(`\n--- Step ${step}: ${title} ---`);
}

function pass(msg: string) {
  console.log(`\x1b[32m[PASS]\x1b[0m ${msg}`);
}

function fail(msg: string): never {
  console.error(`\x1b[31m[FAIL]\x1b[0m ${msg}`);
  process.exit(1);
}

type JsonRecord = Record<string, unknown>;

async function request(
  path: string,
  options: RequestInit = {}
): Promise<{ status: number; ok: boolean; data: JsonRecord }> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = (contentType.includes('application/json')
    ? await res.json()
    : { text: await res.text() }) as JsonRecord;

  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('================================================================');
  console.log('   FULL END-TO-END QA USER JOURNEY VERIFICATION                 ');
  console.log(`   Target Server: ${BASE_URL}                                   `);
  console.log('================================================================');

  // --- 1. Guest Discovery ---
  logStep(1, 'Guest Discovery & Campaign Feed');
  const feedRes = await request('/campaigns?limit=10');
  if (!feedRes.ok) fail(`Failed to fetch public feed: ${JSON.stringify(feedRes.data)}`);
  const campaigns = (feedRes.data.campaigns || feedRes.data.items || feedRes.data) as JsonRecord[];
  if (!Array.isArray(campaigns)) fail('Public feed did not return an array');
  pass(`Public feed returned ${campaigns.length} campaigns. Demo data verified.`);

  // --- 2. Creator Registration ---
  logStep(2, 'Creator Registration');
  const uniqueId = Date.now();
  const creatorEmail = `qa.creator.${uniqueId}@example.com`;
  const creatorPassword = 'DemoPassword123!';
  const creatorName = `QA Creator ${uniqueId.toString().slice(-4)}`;

  const regRes = await request('/auth/sign-up', {
    method: 'POST',
    body: JSON.stringify({
      email: creatorEmail,
      password: creatorPassword,
      name: creatorName,
    }),
  });
  if (!regRes.ok) fail(`Creator registration failed: ${JSON.stringify(regRes.data)}`);
  const creatorTokens = regRes.data.tokens as JsonRecord | undefined;
  const creatorToken = (creatorTokens?.accessToken || regRes.data.accessToken || regRes.data.token) as string;
  if (!creatorToken) fail(`Creator registration did not return an access token: ${JSON.stringify(regRes.data)}`);
  pass(`Creator registered successfully: ${creatorEmail}`);

  // --- 3. Initialize 5-Step Draft ---
  logStep(3, 'Initialize 5-Step Draft (Goal Isolated to Step 5)');
  const draftRes = await request('/campaigns', {
    method: 'POST',
    headers: { Authorization: `Bearer ${creatorToken}` },
    body: JSON.stringify({}),
  });
  if (!draftRes.ok) fail(`Draft creation failed: ${JSON.stringify(draftRes.data)}`);
  const draftId = draftRes.data.id as string;
  const initialGoal = draftRes.data.fundingGoalCents;
  if (initialGoal !== 0 && initialGoal !== null && initialGoal !== undefined) {
    fail(`Draft was created with non-zero fundingGoalCents: ${initialGoal}. Must be strictly isolated to Step 5.`);
  }
  pass(`Draft initialized with ID: ${draftId} (fundingGoalCents initialized to 0)`);

  // --- 4. 5-Step Authoring via Autosave ---
  logStep(4, 'Complete 5-Step Authoring via Autosave');
  const fullStoryText = `This initiative establishes a sustainable local microgrid powered by community solar and clean storage.\n\n` +
    `By decentralizing clean energy production, we reduce carbon emissions, cut household utility expenses, and guarantee emergency backup resilience during severe weather outages.\n\n` +
    `Every single contribution directly finances targeted digital outreach and community education campaigns to secure neighborhood participation and regulatory approvals across target cities.`;

  const autosaveRes = await request(`/campaigns/${draftId}/draft`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${creatorToken}` },
    body: JSON.stringify({
      title: 'Community Renewable Microgrid Initiative',
      category: 'Environment',
      creatorName,
      creatorType: 'individual',
      summary: 'Empowering neighborhoods with resilient solar microgrids and transparent energy democracy.',
      story: [
        { type: 'heading', text: 'Our Vision for Resilient Power' },
        { type: 'paragraph', text: fullStoryText },
      ],
      sources: [
        {
          title: 'Department of Energy Community Solar Study',
          url: 'https://energy.gov/communitysolar/report',
          notes: 'Peer-reviewed distribution data',
        },
      ],
      coverUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1200',
      adCreative: {
        images: ['https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800'],
        headline: 'Power Your Neighborhood',
        description: 'Join the community microgrid movement today. Transparent ad-funded impact.',
        cta: 'Learn More',
      },
      reach: {
        locations: ['Austin, TX', 'Denver, CO'],
        channels: ['Social feeds', 'Search'],
        budgetAllocation: {
          'Social feeds': 60,
          'Search': 40,
        },
        durationDays: 30,
      },
      fundingGoalCents: 150000, // Step 5 entered goal ($1,500.00)
    }),
  });
  if (!autosaveRes.ok) fail(`Autosave failed: ${JSON.stringify(autosaveRes.data)}`);
  pass('5 steps filled via autosave. Goal entered on Step 5: $1,500.00 (150,000 cents).');

  // --- 5. Submit Campaign (Enforce 4 Checkboxes / acceptedRules Gate) ---
  logStep(5, 'Submit Campaign with Mandatory Confirmations');
  const failedSubmitRes = await request(`/campaigns/${draftId}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${creatorToken}` },
    body: JSON.stringify({ acceptedRules: false }),
  });
  if (failedSubmitRes.ok) fail('Submit should have failed when acceptedRules is false');
  pass('Submit correctly rejected when acceptedRules is false.');

  const submitRes = await request(`/campaigns/${draftId}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${creatorToken}` },
    body: JSON.stringify({ acceptedRules: true }),
  });
  if (!submitRes.ok) fail(`Submit failed with acceptedRules=true: ${JSON.stringify(submitRes.data)}`);
  if (submitRes.data.status !== 'SUBMITTED') fail(`Expected status SUBMITTED, got ${submitRes.data.status}`);
  pass(`Campaign submitted successfully. Status: ${submitRes.data.status}`);

  // --- 6. Admin Sign-In & Review Queue ---
  logStep(6, 'Reviewer / Admin Sign-In & Queue Inspection');
  const adminLoginRes = await request('/auth/sign-in', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@demo.com',
      password: 'Demo@1234',
    }),
  });
  if (!adminLoginRes.ok) fail(`Admin login failed: ${JSON.stringify(adminLoginRes.data)}`);
  const adminTokens = adminLoginRes.data.tokens as JsonRecord | undefined;
  const adminToken = (adminTokens?.accessToken || adminLoginRes.data.accessToken || adminLoginRes.data.token) as string;
  if (!adminToken) fail('Admin login did not return token');
  pass('Admin logged in successfully.');

  const queueRes = await request('/admin/queue', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!queueRes.ok) fail(`Failed to fetch admin queue: ${JSON.stringify(queueRes.data)}`);
  const queueItems = (Array.isArray(queueRes.data) ? queueRes.data : (queueRes.data.items as JsonRecord[]) || []) as JsonRecord[];
  const queuedCampaign = queueItems.find((c) => c.id === draftId);
  if (!queuedCampaign) fail(`Submitted campaign ${draftId} not found in admin queue`);
  pass(`Campaign ${draftId} found in Review Queue.`);

  // --- 7. Admin Approval ---
  logStep(7, 'Admin Approves Campaign (SUBMITTED -> FUNDING)');
  const approveRes = await request(`/admin/campaigns/${draftId}/decision`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      decision: 'APPROVE',
      notes: 'Verified sources and ad creatives compliant with community standards.',
    }),
  });
  if (!approveRes.ok) fail(`Admin approval failed: ${JSON.stringify(approveRes.data)}`);
  pass('Admin approved campaign.');

  // Verify campaign is now FUNDING and publicly accessible
  const publicCampaignRes = await request(`/campaigns/${draftId}`);
  if (!publicCampaignRes.ok) fail(`Approved campaign not visible publicly: ${JSON.stringify(publicCampaignRes.data)}`);
  if (publicCampaignRes.data.status !== 'FUNDING') {
    fail(`Expected campaign status FUNDING, got: ${publicCampaignRes.data.status}`);
  }
  pass(`Campaign is live and in status FUNDING!`);

  // --- 8. Backer Sign-In ---
  logStep(8, 'Backer Sign-In');
  const backerLoginRes = await request('/auth/sign-in', {
    method: 'POST',
    body: JSON.stringify({
      email: 'backer@demo.com',
      password: 'Demo@1234',
    }),
  });
  if (!backerLoginRes.ok) fail(`Backer login failed: ${JSON.stringify(backerLoginRes.data)}`);
  const backerTokens = backerLoginRes.data.tokens as JsonRecord | undefined;
  const backerToken = (backerTokens?.accessToken || backerLoginRes.data.accessToken || backerLoginRes.data.token) as string;
  pass('Backer logged in successfully (backer@demo.com).');

  // --- 9. Create Contribution & Payment Rejection Test (Magic Card ...0002) ---
  logStep(9, 'Simulated Payment Card Declined Test (Card ...0002)');
  const createContribRes1 = await request('/contributions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${backerToken}` },
    body: JSON.stringify({
      campaignId: draftId,
      amountCents: 5000,
      isAnonymous: false,
      publicName: 'Demo Backer',
    }),
  });
  if (!createContribRes1.ok) fail(`Failed to create contribution: ${JSON.stringify(createContribRes1.data)}`);
  const contrib1 = (createContribRes1.data.contribution || createContribRes1.data) as JsonRecord;
  const contribId1 = contrib1.id as string;
  if (!contribId1) fail(`Contribution creation did not return id: ${JSON.stringify(createContribRes1.data)}`);

  const declinedRes = await request(`/contributions/${contribId1}/pay`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${backerToken}` },
    body: JSON.stringify({
      cardNumber: '4000 0000 0000 0002',
      expMonth: '12',
      expYear: '28',
      cvc: '123',
    }),
  });
  if (declinedRes.data?.status !== 'FAILED') {
    fail(`Expected payment status FAILED, got: ${JSON.stringify(declinedRes.data)}`);
  }
  const reason = (declinedRes.data.failureReason || declinedRes.data.message) as string;
  pass(`Declined card correctly handled: status=${declinedRes.data.status}, reason=${reason}`);

  // --- 10. Payment Success Test (Magic Card 4242..., $50.00) ---
  logStep(10, 'Simulated Payment Success Test (Card 4242..., $50.00)');
  const createContribRes2 = await request('/contributions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${backerToken}` },
    body: JSON.stringify({
      campaignId: draftId,
      amountCents: 5000,
      isAnonymous: false,
      publicName: 'Verified Community Backer',
    }),
  });
  if (!createContribRes2.ok) fail(`Failed to create contribution: ${JSON.stringify(createContribRes2.data)}`);
  const contrib2 = (createContribRes2.data.contribution || createContribRes2.data) as JsonRecord;
  const contribId2 = contrib2.id as string;
  if (!contribId2) fail(`Contribution creation did not return id: ${JSON.stringify(createContribRes2.data)}`);

  const payRes = await request(`/contributions/${contribId2}/pay`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${backerToken}` },
    body: JSON.stringify({
      cardNumber: '4242 4242 4242 4242',
      expMonth: '12',
      expYear: '28',
      cvc: '123',
      cardholderName: 'Verified Community Backer',
    }),
  });
  if (!payRes.ok || payRes.data?.status !== 'SUCCEEDED') {
    fail(`Payment failed: ${JSON.stringify(payRes.data)}`);
  }
  const contribution = (payRes.data.contribution || payRes.data) as JsonRecord;
  const receipt = (payRes.data.receipt || contribution) as JsonRecord;
  const receiptNumber = (receipt.receiptNo || contribution.receiptNo) as string;
  if (!receiptNumber || !receiptNumber.startsWith('REC-')) {
    fail(`Receipt number missing or invalid format: ${receiptNumber}`);
  }
  pass(`Payment succeeded! Receipt: ${receiptNumber}, Amount: $50.00, Status: ${payRes.data.status}`);

  // --- 11. Idempotency Verification ---
  logStep(11, 'Idempotent Payment Re-Submission Test');
  const duplicateRes = await request(`/contributions/${contribId2}/pay`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${backerToken}` },
    body: JSON.stringify({
      cardNumber: '4242 4242 4242 4242',
      expMonth: '12',
      expYear: '28',
      cvc: '123',
    }),
  });
  if (!duplicateRes.ok) fail(`Duplicate payment request failed unexpectedly: ${JSON.stringify(duplicateRes.data)}`);
  const dupReceipt = (duplicateRes.data.receipt || duplicateRes.data) as JsonRecord;
  const duplicateReceiptNo = (dupReceipt.receiptNo || duplicateRes.data.receiptNo) as string;
  if (duplicateReceiptNo !== receiptNumber) {
    fail(`Idempotent re-submission returned different receipt! Expected ${receiptNumber}, got ${duplicateReceiptNo}`);
  }
  pass('Payment idempotency confirmed: duplicate payment returned existing receipt without double-charging.');

  // --- 12. Campaign Metric & Ledger Verification ---
  logStep(12, 'Campaign Raised Amount & Backer Count Update Check');
  const updatedCampaignRes = await request(`/campaigns/${draftId}`);
  if (!updatedCampaignRes.ok) fail('Failed to fetch updated campaign');
  const updatedCampaign = updatedCampaignRes.data;
  if (updatedCampaign.raisedCents !== 5000) {
    fail(`Expected raisedCents to be 5000, got ${updatedCampaign.raisedCents}`);
  }
  const backersSummary = updatedCampaign.backersSummary as JsonRecord | undefined;
  const backerCount = (backersSummary?.totalCount ?? updatedCampaign.backerCount) as number;
  if (backerCount !== 1) {
    fail(`Expected backer count to be 1, got ${backerCount}`);
  }
  pass(`Campaign metrics updated accurately: Raised $50.00, Backers: 1`);

  // --- 13. Backer Transaction History ---
  logStep(13, 'Backer Transaction History & Receipt Check');
  const myContribsRes = await request('/me/contributions', {
    headers: { Authorization: `Bearer ${backerToken}` },
  });
  if (!myContribsRes.ok) fail(`Failed to fetch backer history: ${JSON.stringify(myContribsRes.data)}`);
  const myContribs = (Array.isArray(myContribsRes.data) ? myContribsRes.data : (myContribsRes.data.items as JsonRecord[]) || []) as JsonRecord[];
  const foundReceipt = myContribs.find((c) => c.receiptNo === receiptNumber);
  if (!foundReceipt) fail(`Receipt ${receiptNumber} not found in backer's transaction history`);
  pass(`Receipt ${receiptNumber} found in backer payment history.`);

  // --- 14. Full Funding Goal Simulation (Non-Auto-Promotion Check) ---
  logStep(14, 'Simulate Funding Goal Reached (Check: Non-Auto-Promotion)');
  const fundGoalRes = await request(`/admin/campaigns/${draftId}/simulate-fund-goal`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!fundGoalRes.ok) fail(`Simulate fund goal failed: ${JSON.stringify(fundGoalRes.data)}`);

  const closedCampaignRes = await request(`/campaigns/${draftId}`);
  if (!closedCampaignRes.ok) fail('Failed to fetch closed campaign');
  if (closedCampaignRes.data.status !== 'FUNDING_CLOSED') {
    fail(`Expected FUNDING_CLOSED upon reaching goal, but got ${closedCampaignRes.data.status}. Reaching funding goal must NEVER auto-promote!`);
  }
  pass(`Funding goal simulation complete. Status is FUNDING_CLOSED (did NOT auto-promote to PROMOTING).`);

  // --- 15. Advance to DISTRIBUTION_PREP ---
  logStep(15, 'Advance: FUNDING_CLOSED -> DISTRIBUTION_PREP');
  const prepRes = await request(`/admin/campaigns/${draftId}/advance`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ notes: 'Funds settled. Targeting parameters confirmed.' }),
  });
  if (!prepRes.ok) fail(`Advance to DISTRIBUTION_PREP failed: ${JSON.stringify(prepRes.data)}`);
  if (prepRes.data.status !== 'DISTRIBUTION_PREP') {
    fail(`Expected DISTRIBUTION_PREP, got ${prepRes.data.status}`);
  }
  pass(`Campaign advanced to DISTRIBUTION_PREP.`);

  // --- 16. Advance to PROMOTING ---
  logStep(16, 'Advance: DISTRIBUTION_PREP -> PROMOTING');
  const promoRes = await request(`/admin/campaigns/${draftId}/advance`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ notes: 'Ad campaigns published to Meta & Google Search.' }),
  });
  if (!promoRes.ok) fail(`Advance to PROMOTING failed: ${JSON.stringify(promoRes.data)}`);
  if (promoRes.data.status !== 'PROMOTING') {
    fail(`Expected PROMOTING, got ${promoRes.data.status}`);
  }
  pass(`Campaign advanced to PROMOTING. Ad distribution active.`);

  // --- 17. Advance to COMPLETED & Report Verification ---
  logStep(17, 'Advance: PROMOTING -> COMPLETED & Performance Report');
  const compRes = await request(`/admin/campaigns/${draftId}/advance`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ notes: 'Ad flight concluded. Final delivery report tallied.' }),
  });
  if (!compRes.ok) fail(`Advance to COMPLETED failed: ${JSON.stringify(compRes.data)}`);
  if (compRes.data.status !== 'COMPLETED') {
    fail(`Expected COMPLETED, got ${compRes.data.status}`);
  }
  pass(`Campaign completed successfully.`);

  // Verify Public Report
  const reportRes = await request(`/campaigns/${draftId}/report`);
  if (!reportRes.ok) fail(`Failed to fetch campaign report: ${JSON.stringify(reportRes.data)}`);
  const report = reportRes.data;
  if (!report || report.reachType !== 'MEASURED') {
    fail(`Expected report reachType MEASURED, got: ${report?.reachType}`);
  }
  const ctr = typeof report.ctr === 'number' ? (report.ctr * 100).toFixed(2) : 'N/A';
  pass(`Public Performance Report verified! Impressions: ${report.impressions}, Reach: ${report.reach} (${report.reachType}), Clicks: ${report.clicks}, CTR: ${ctr}%`);

  console.log('\n================================================================');
  console.log('\x1b[32m[ALL CHECKS PASSED]\x1b[0m Full E2E Production User Journey Verified!');
  console.log('================================================================\n');
}

run().catch((err) => {
  console.error('Unhandled script error:', err);
  process.exit(1);
});
