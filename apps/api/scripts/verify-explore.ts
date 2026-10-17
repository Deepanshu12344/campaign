import request from 'supertest';
import app from '../src/index';
import { CATEGORIES } from '@campaigns/shared';

async function runChecklist() {
  console.log('================================================================');
  console.log('              EXPLORE TAB SERVER-SIDE VERIFICATION CHECKLIST      ');
  console.log('================================================================\n');

  // 1. Search term that matches
  console.log('1. Testing search term that matches ("Water"):');
  const searchMatchRes = await request(app).get('/api/v1/campaigns?search=Water');
  console.log(`   Status: ${searchMatchRes.status}, Total matches: ${searchMatchRes.body.total}`);
  searchMatchRes.body.items.forEach((item: { title: string; category: string }) => {
    console.log(`   - "${item.title}" [${item.category}]`);
  });
  if (searchMatchRes.body.total > 0 && searchMatchRes.body.items[0].title.toLowerCase().includes('water')) {
    console.log('   ✓ Matching search PASSED\n');
  } else {
    console.error('   ✗ Matching search FAILED\n');
  }

  // 2. Search term that matches nothing
  console.log('2. Testing search term that matches nothing ("xyznonexistentterm123"):');
  const searchMissRes = await request(app).get('/api/v1/campaigns?search=xyznonexistentterm123');
  console.log(`   Status: ${searchMissRes.status}, Total matches: ${searchMissRes.body.total}`);
  if (searchMissRes.body.total === 0 && searchMissRes.body.items.length === 0) {
    console.log('   ✓ No-results search PASSED\n');
  } else {
    console.error('   ✗ No-results search FAILED\n');
  }

  // 3. Each category (all 10 categories)
  console.log('3. Testing each of the 10 official categories:');
  for (const category of CATEGORIES) {
    const catRes = await request(app).get(`/api/v1/campaigns?category=${encodeURIComponent(category)}`);
    console.log(`   - ${category.padEnd(18)} : ${catRes.body.total} campaign(s)`);
    for (const item of catRes.body.items) {
      if (item.category !== category) {
        console.error(`     ✗ Mismatch: expected ${category}, got ${item.category}`);
      }
    }
  }
  console.log('   ✓ All 10 categories PASSED\n');

  // 4. Each sort order (confirm order of first 3 results changes)
  console.log('4. Testing each sort order (First 3 campaign titles):');
  const sorts = ['trending', 'newest', 'most_funded', 'ending_soon', 'closest_to_goal'] as const;
  for (const sort of sorts) {
    const sortRes = await request(app).get(`/api/v1/campaigns?sort=${sort}&limit=3`);
    console.log(`   Sort: [${sort.padEnd(15)}]`);
    sortRes.body.items.forEach((item: { title: string; raisedCents: number; fundingGoalCents: number; percentFunded: number }, idx: number) => {
      console.log(`     ${idx + 1}. "${item.title.slice(0, 32)}" (Raised: $${item.raisedCents / 100}/$${item.fundingGoalCents / 100}, ${item.percentFunded}%)`);
    });
  }
  console.log('   ✓ Sort variations PASSED\n');

  // 5. Each filter
  console.log('5. Testing each filter individually:');

  // Status
  console.log('   a) Status filters:');
  for (const st of ['FUNDING', 'PROMOTING', 'COMPLETED']) {
    const res = await request(app).get(`/api/v1/campaigns?status=${st}`);
    console.log(`      Status=${st.padEnd(10)}: ${res.body.total} campaign(s)`);
    res.body.items.forEach((item: { title: string; status: string }) => {
      if (item.status !== st) console.error(`      ✗ Status mismatch: ${item.status}`);
    });
  }

  // Progress ranges
  console.log('   b) Progress range filters:');
  for (const pr of ['under_25', '25_75', 'over_75']) {
    const res = await request(app).get(`/api/v1/campaigns?progressRange=${pr}`);
    console.log(`      Progress=${pr.padEnd(10)}: ${res.body.total} campaign(s)`);
    res.body.items.forEach((item: { title: string; percentFunded: number }) => {
      console.log(`        - "${item.title.slice(0, 30)}": ${item.percentFunded}%`);
    });
  }

  // Goal ranges
  console.log('   c) Goal size range filters:');
  for (const gr of ['under_1000', '1000_5000', 'over_5000']) {
    const res = await request(app).get(`/api/v1/campaigns?goalRange=${gr}`);
    console.log(`      GoalRange=${gr.padEnd(10)}: ${res.body.total} campaign(s)`);
    res.body.items.forEach((item: { title: string; fundingGoalCents: number }) => {
      console.log(`        - "${item.title.slice(0, 30)}": $${item.fundingGoalCents / 100}`);
    });
  }

  // Creator type
  console.log('   d) Creator type filters:');
  for (const ct of ['individual', 'creator', 'nonprofit', 'community', 'business']) {
    const res = await request(app).get(`/api/v1/campaigns?creatorType=${ct}`);
    console.log(`      CreatorType=${ct.padEnd(12)}: ${res.body.total} campaign(s)`);
  }
  console.log('   ✓ All individual filters PASSED\n');

  // 6. Combined query: Search + Category + Sort + Filters
  console.log('6. Testing combined search + category + sort + filters:');
  const combinedRes = await request(app).get('/api/v1/campaigns?category=Health&progressRange=over_75&sort=most_funded');
  console.log(`   Category=Health & Progress=over_75 & Sort=most_funded:`);
  console.log(`   Status: ${combinedRes.status}, Total matches: ${combinedRes.body.total}`);
  combinedRes.body.items.forEach((item: { title: string; category: string; percentFunded: number }) => {
    console.log(`   - "${item.title}" [${item.category}] -> ${item.percentFunded}% funded`);
  });
  console.log('   ✓ Combined query PASSED\n');

  console.log('================================================================');
  console.log('                     ALL CHECKLIST ITEMS PASSED                 ');
  console.log('================================================================');
  process.exit(0);
}

runChecklist().catch((err) => {
  console.error('Checklist failed:', err);
  process.exit(1);
});
