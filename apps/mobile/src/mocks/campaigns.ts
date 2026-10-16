import { CampaignCardDto, reachAtGoal } from '@campaigns/shared';

const waterReach = reachAtGoal(150000);
const rooftopReach = reachAtGoal(200000);
const openDataReach = reachAtGoal(100000);
const soilReach = reachAtGoal(300000);

export const MOCK_CAMPAIGNS: CampaignCardDto[] = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    title: 'Clean Drinking Water in Jackson, MS',
    category: 'Health',
    creatorName: 'Clean Water Coalition',
    creatorType: 'nonprofit',
    summary:
      'Amplifying public awareness around municipal water testing transparency and lead line replacements across vulnerable neighborhoods.',
    coverUrl:
      'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80',
    status: 'FUNDING',
    fundingGoalCents: 150000,
    raisedCents: 112500,
    percentFunded: 75,
    daysRemaining: 12,
    estimatedReachLow: waterReach.estimatedReachLow,
    estimatedReachHigh: waterReach.estimatedReachHigh,
    isDemo: true,
  },
  {
    id: 'c9b4a1b8-2a91-4d37-88e2-45e52c8b81a1',
    title: 'Urban Rooftop Gardens Network',
    category: 'Environment',
    creatorName: 'Elena Rostova',
    creatorType: 'individual',
    summary:
      'Promoting community-led rooftop agriculture across 14 high-density city school districts to fight urban heat islands.',
    coverUrl:
      'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=800&q=80',
    status: 'PROMOTING',
    fundingGoalCents: 200000,
    raisedCents: 200000,
    percentFunded: 100,
    daysRemaining: 0,
    estimatedReachLow: rooftopReach.estimatedReachLow,
    estimatedReachHigh: rooftopReach.estimatedReachHigh,
    isDemo: true,
  },
  {
    id: 'a71e42e8-5b12-4217-91a3-8321cf7b19de',
    title: 'Open Civic Data for Municipal Budgets',
    category: 'Public Policy',
    creatorName: 'Civic Open Tech',
    creatorType: 'community',
    summary:
      'Funding targeted explainer ads to help everyday residents decode annual municipal budget hearings and tax allocations.',
    coverUrl:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    status: 'FUNDING',
    fundingGoalCents: 100000,
    raisedCents: 42000,
    percentFunded: 42,
    daysRemaining: 18,
    estimatedReachLow: openDataReach.estimatedReachLow,
    estimatedReachHigh: openDataReach.estimatedReachHigh,
    isDemo: true,
  },
  {
    id: 'e2a87d09-1704-4cbf-8b2b-3e54b6801267',
    title: 'Living Soil & Regenerative Microbes',
    category: 'Science',
    creatorName: 'Dr. Marcus Vance',
    creatorType: 'creator',
    summary:
      'Educational video campaign breaking down soil biome health and regenerative compost biology for suburban gardeners.',
    coverUrl:
      'https://images.unsplash.com/photo-1592417817098-8f3d69102a46?auto=format&fit=crop&w=800&q=80',
    status: 'FUNDING',
    fundingGoalCents: 300000,
    raisedCents: 85000,
    percentFunded: 28,
    daysRemaining: 24,
    estimatedReachLow: soilReach.estimatedReachLow,
    estimatedReachHigh: soilReach.estimatedReachHigh,
    isDemo: true,
  },
];
