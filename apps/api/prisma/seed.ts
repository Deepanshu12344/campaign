import { PrismaClient, Category, CreatorType, CampaignStatus, ContributionStatus, ReviewDecisionType, FeedbackResponse, ReachType, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { quote } from '@campaigns/shared';

const prisma = new PrismaClient();

// Demo password hash for "Demo@1234"
const DEMO_PASSWORD = 'Demo@1234';

// Deterministic UUIDs for idempotent seeding
const USERS = {
  admin: '11111111-1111-4111-8111-111111111111',
  creator: '22222222-2222-4222-8222-222222222222',
  backer: '33333333-3333-4333-8333-333333333333',
  sarah: '44444444-4444-4444-8444-444444444444',
  david: '55555555-5555-4555-8555-555555555555',
};

const CAMPAIGNS = {
  water: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  rooftop: 'c9b4a1b8-2a91-4d37-88e2-45e52c8b81a1',
  openData: 'a71e42e8-5b12-4217-91a3-8321cf7b19de',
  soil: 'e2a87d09-1704-4cbf-8b2b-3e54b6801267',
  coding: 'b1234567-89ab-4cde-8012-3456789abcde',
  mainStreet: 'c2345678-90ab-4cde-8123-456789abcdef',
  crosswalk: 'd3456789-01ab-4cde-8234-56789abcdef0',
  looms: 'e4567890-12ab-4cde-8345-6789abcdef01',
  bookstore: 'f5678901-23ab-4cde-8456-789abcdef012',
  cleanEnergy: '06789012-34ab-4cde-8567-89abcdef0123',
  creatorDraft: '17890123-45ab-4cde-8678-9abcdef01234',
  creatorSubmitted: '28901234-56ab-4cde-8789-abcdef012345',
  creatorChanges: '39012345-67ab-4cde-8890-bcdef0123456',
};

async function main() {
  console.log('Seeding database with credible campaigns & exact contribution ledgers...');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 1. Seed Users (Admin, Creator, Backer, other community backers)
  const userSeeds = [
    {
      id: USERS.admin,
      email: 'admin@demo.com',
      passwordHash,
      name: 'Elena Vance (Admin)',
      role: UserRole.ADMIN,
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
      notificationPrefs: { email: true, inApp: true, reviewAlerts: true },
    },
    {
      id: USERS.creator,
      email: 'creator@demo.com',
      passwordHash,
      name: 'Maya Lin (Creator)',
      role: UserRole.USER,
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
      notificationPrefs: { email: true, inApp: true, campaignMilestones: true },
    },
    {
      id: USERS.backer,
      email: 'backer@demo.com',
      passwordHash,
      name: 'Jordan Reed (Backer)',
      role: UserRole.USER,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
      notificationPrefs: { email: true, inApp: true, contributionReceipts: true },
    },
    {
      id: USERS.sarah,
      email: 'sarah.j@example.com',
      passwordHash,
      name: 'Sarah Jenkins',
      role: UserRole.USER,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
      notificationPrefs: { email: true, inApp: true },
    },
    {
      id: USERS.david,
      email: 'david.k@example.com',
      passwordHash,
      name: 'David Kim',
      role: UserRole.USER,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      notificationPrefs: { email: true, inApp: true },
    },
  ];

  for (const u of userSeeds) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {
        email: u.email,
        name: u.name,
        role: u.role,
        avatarUrl: u.avatarUrl,
        passwordHash: u.passwordHash,
        notificationPrefs: u.notificationPrefs,
      },
      create: u,
    });
  }

  console.log(`✓ Seeded ${userSeeds.length} demo users`);

  // Helper date generators
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
  const daysAhead = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  // 2. Define Campaigns Data
  const campaignsData = [
    // 1. Health - FUNDING (75%)
    {
      id: CAMPAIGNS.water,
      creatorId: USERS.creator,
      status: CampaignStatus.FUNDING,
      title: 'Clean Drinking Water in Jackson, MS',
      category: Category.HEALTH,
      creatorName: 'Clean Water Coalition',
      creatorType: CreatorType.NONPROFIT,
      summary:
        'Amplifying public awareness around municipal water testing transparency and lead line replacements across vulnerable neighborhoods.',
      coverUrl:
        'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=1200&q=80',
      fallbackImageUrl:
        'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=400&q=60',
      fundingGoalCents: 150000,
      raisedCents: 112500, // $1,125.00
      startsAt: daysAgo(18),
      endsAt: daysAhead(12),
      submittedAt: daysAgo(20),
      publishedAt: daysAgo(18),
      version: 1,
      story: [
        {
          type: 'heading',
          level: 1,
          text: 'Why Transparent Water Data Saves Lives in Jackson',
        },
        {
          type: 'paragraph',
          text: 'For over three decades, residents of West Jackson have navigated intermittent boil-water notices, aged cast-iron mains, and uncertain lead filtration efficacy. While infrastructure funds are allocated, everyday residents frequently lack access to neighborhood-level lead sampling results.',
        },
        {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=1000&q=80',
          caption: 'Community water sample collection and independent turbidity testing.',
          credit: 'Photo by CDC on Unsplash',
        },
        {
          type: 'stat',
          value: '43,000',
          label: 'Residents currently without clear neighborhood testing maps',
          source: 'Mississippi State Department of Health 2025 Audit',
        },
        {
          type: 'paragraph',
          text: 'This campaign finances educational mobile and social ad distribution directly into Jackson zip codes, directing parents and local homeowners to free state-certified water test kits and filter replacement subsidies.',
        },
        {
          type: 'actions',
          items: [
            'Request a free residential lead test kit via municipal hotline',
            'Verify your line material on the public lead pipe registry',
            'Attend the monthly water authority oversight hearing',
          ],
        },
      ],
      sources: [
        {
          title: 'EPA Compliance Monitoring: Jackson Water System Overview',
          url: 'https://www.epa.gov/ms/jackson-water-crisis-updates',
          publisher: 'US Environmental Protection Agency',
          note: 'Official federal enforcement and monitoring records.',
          isDemo: true,
        },
        {
          title: 'Public Health Impact of Chronic Lead Pipe Infrastructure',
          url: 'https://www.cdc.gov/nceh/lead/prevention/sources/water.htm',
          publisher: 'Centers for Disease Control and Prevention',
          isDemo: true,
        },
      ],
      adCreative: {
        headline: 'Test Your Jackson Tap Water for Free',
        description: 'Get free state-certified test kits delivered. Check lead levels in your neighborhood.',
        cta: 'Order Free Kit',
        images: [
          'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80',
        ],
      },
      reach: {
        locations: ['Jackson, MS', 'Hinds County, MS'],
        interests: ['Community Health', 'Parenting', 'Local News'],
        channels: ['Meta Feed', 'Google Search', 'Local Display'],
        budgetAllocation: { meta: 0.6, google: 0.3, display: 0.1 },
        durationDays: 30,
      },
      contributions: [
        { amount: 50000, user: USERS.sarah, publicName: 'Sarah Jenkins', anon: false },
        { amount: 25000, user: USERS.backer, anon: true },
        { amount: 15000, anon: true },
        { amount: 10000, publicName: 'Marcus L.', anon: false },
        { amount: 7500, anon: true },
        { amount: 5000, anon: true },
      ],
    },

    // 2. Environment - PROMOTING (100%)
    {
      id: CAMPAIGNS.rooftop,
      creatorId: USERS.david,
      status: CampaignStatus.PROMOTING,
      title: 'Urban Rooftop Gardens Network',
      category: Category.ENVIRONMENT,
      creatorName: 'Elena Rostova',
      creatorType: CreatorType.INDIVIDUAL,
      summary:
        'Promoting community-led rooftop agriculture across 14 high-density city school districts to fight urban heat islands.',
      coverUrl:
        'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=1200&q=80',
      fallbackImageUrl:
        'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=400&q=60',
      fundingGoalCents: 200000,
      raisedCents: 200000, // $2,000.00
      startsAt: daysAgo(35),
      endsAt: daysAgo(5),
      submittedAt: daysAgo(40),
      publishedAt: daysAgo(35),
      version: 1,
      story: [
        {
          type: 'heading',
          level: 1,
          text: 'Cooling Dense City Schoolblocks with Living Roofs',
        },
        {
          type: 'paragraph',
          text: 'During peak heat waves, asphalt school roofs exceed 140°F, creating severe urban heat islands that strain classroom ventilation and exacerbate childhood asthma in concrete-dense neighborhoods.',
        },
        {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1592417817098-8f3d69102a46?auto=format&fit=crop&w=1000&q=80',
          caption: 'Sedum beds and community vegetable planters installed on elementary school rooftops.',
          credit: 'Photo by Markus Spiske on Unsplash',
        },
        {
          type: 'stat',
          value: '8.4°F',
          label: 'Average surface temperature drop across vegetated rooftops',
          source: 'City Climate & Urban Forestry Consortium',
        },
        {
          type: 'paragraph',
          text: 'This completed campaign is now actively running targeted awareness campaigns educating school boards and parents on state green-roof construction vouchers.',
        },
        {
          type: 'actions',
          items: [
            'Review the green roof school voucher guidelines',
            'Nominate a neighborhood public school building',
          ],
        },
      ],
      sources: [
        {
          title: 'Urban Heat Island Mitigation Through Green Roofs',
          url: 'https://www.epa.gov/heatislands/using-green-roofs-reduce-heat-islands',
          publisher: 'US Environmental Protection Agency',
          isDemo: true,
        },
      ],
      adCreative: {
        headline: 'Turn Asphalt Roofs into Living Gardens',
        description: 'See how urban schools are lowering summer temperatures and growing fresh produce.',
        cta: 'Explore School Vouchers',
        images: [
          'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=800&q=80',
        ],
      },
      reach: {
        locations: ['Metro Chicago', 'Cook County, IL'],
        interests: ['Gardening', 'Education', 'Environment'],
        channels: ['Meta Feed', 'Instagram Stories'],
        budgetAllocation: { meta: 0.7, instagram: 0.3 },
        durationDays: 30,
      },
      contributions: [
        { amount: 100000, publicName: 'Green Horizon Fund', anon: false },
        { amount: 50000, user: USERS.backer, anon: true },
        { amount: 25000, user: USERS.david, publicName: 'David K.', anon: false },
        { amount: 15000, anon: true },
        { amount: 10000, anon: true },
      ],
    },

    // 3. Public Policy - FUNDING (42%)
    {
      id: CAMPAIGNS.openData,
      creatorId: USERS.creator,
      status: CampaignStatus.FUNDING,
      title: 'Open Civic Data for Municipal Budgets',
      category: Category.PUBLIC_POLICY,
      creatorName: 'Civic Open Tech',
      creatorType: CreatorType.COMMUNITY,
      summary:
        'Funding targeted explainer ads to help everyday residents decode annual municipal budget hearings and tax allocations.',
      coverUrl:
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
      fallbackImageUrl:
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=60',
      fundingGoalCents: 100000,
      raisedCents: 42000, // $420.00
      startsAt: daysAgo(12),
      endsAt: daysAhead(18),
      submittedAt: daysAgo(14),
      publishedAt: daysAgo(12),
      version: 1,
      story: [
        {
          type: 'heading',
          level: 1,
          text: 'Where Does Your City Tax Dollar Really Go?',
        },
        {
          type: 'paragraph',
          text: 'City budgets often span 600-page PDF scans, concealing critical funding decisions about libraries, street repairs, and youth centers behind opaque financial terminology.',
        },
        {
          type: 'stat',
          value: '<2%',
          label: 'Average public turnout at city council budget hearings',
          source: 'Civic Engagement Institute Annual Review',
        },
        {
          type: 'paragraph',
          text: 'We decode complex budget tables into interactive visualizations and push explanatory social posts during the public comment window.',
        },
        {
          type: 'actions',
          items: [
            'Search your council district budget breakdown',
            'Submit public testimony online before the vote',
          ],
        },
      ],
      sources: [
        {
          title: 'Sunlight Foundation: Principles of Civic Data Transparency',
          url: 'https://sunlightfoundation.com/policy/documents/ten-principles-for-opening-up-government-information/',
          publisher: 'Sunlight Foundation',
          isDemo: true,
        },
      ],
      adCreative: {
        headline: 'Decode Your City Budget in 3 Minutes',
        description: 'See where taxes go before the final council vote. Interactive district tool.',
        cta: 'View Budget Tool',
        images: [
          'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
        ],
      },
      reach: {
        locations: ['Austin, TX'],
        interests: ['Civic Engagement', 'Local Politics', 'Public Transit'],
        channels: ['Meta Feed', 'Reddit Local'],
        budgetAllocation: { meta: 0.6, reddit: 0.4 },
        durationDays: 30,
      },
      contributions: [
        { amount: 20000, user: USERS.backer, anon: true },
        { amount: 10000, publicName: 'OpenGov Enthusiast', anon: false },
        { amount: 7000, anon: true },
        { amount: 5000, anon: true },
      ],
    },

    // 4. Science - FUNDING (28%)
    {
      id: CAMPAIGNS.soil,
      creatorId: USERS.david,
      status: CampaignStatus.FUNDING,
      title: 'The Quiet Science of Soil Microbes',
      category: Category.SCIENCE,
      creatorName: 'Field Notes Lab',
      creatorType: CreatorType.CREATOR,
      summary:
        'Educational video campaign breaking down soil biome health and regenerative compost biology for suburban gardeners.',
      coverUrl:
        'https://images.unsplash.com/photo-1592417817098-8f3d69102a46?auto=format&fit=crop&w=1200&q=80',
      fallbackImageUrl:
        'https://images.unsplash.com/photo-1592417817098-8f3d69102a46?auto=format&fit=crop&w=400&q=60',
      fundingGoalCents: 300000,
      raisedCents: 85000, // $850.00
      startsAt: daysAgo(6),
      endsAt: daysAhead(24),
      submittedAt: daysAgo(8),
      publishedAt: daysAgo(6),
      version: 1,
      story: [
        {
          type: 'heading',
          level: 1,
          text: 'Restoring Underground Biodiversity Beneath Suburban Lawns',
        },
        {
          type: 'paragraph',
          text: 'A single teaspoon of healthy soil contains more living microorganisms than there are humans on Earth. Synthetic chemical fertilizers disrupt these delicate mycorrhizal networks, leading to nutrient runoff into regional rivers.',
        },
        {
          type: 'stat',
          value: '1 Billion+',
          label: 'Fungi and beneficial bacteria per gram of living compost',
          source: 'USDA Natural Resources Conservation Service',
        },
        {
          type: 'paragraph',
          text: 'Funding delivers short, peer-reviewed educational videos to suburban homeowners on transitioning from synthetic lawn treatments to biological composting.',
        },
        {
          type: 'actions',
          items: [
            'Test your garden soil pH and organic matter',
            'Start a no-till backyard compost pile',
          ],
        },
      ],
      sources: [
        {
          title: 'Soil Biology Primer: Mycorrhizae & Nutrient Cycling',
          url: 'https://www.nrcs.usda.gov/resources/guides-and-instructions/soil-biology-primer',
          publisher: 'USDA Natural Resources Conservation Service',
          isDemo: true,
        },
      ],
      adCreative: {
        headline: 'Feed the Soil, Not Just the Plant',
        description: 'Discover how living soil microbes unlock natural garden resilience without chemicals.',
        cta: 'Watch Free Guide',
        images: [
          'https://images.unsplash.com/photo-1592417817098-8f3d69102a46?auto=format&fit=crop&w=800&q=80',
        ],
      },
      reach: {
        locations: ['Pacific Northwest', 'Mid-Atlantic'],
        interests: ['Organic Gardening', 'Permaculture', 'Ecology'],
        channels: ['YouTube Ads', 'Meta Feed'],
        budgetAllocation: { youtube: 0.6, meta: 0.4 },
        durationDays: 30,
      },
      contributions: [
        { amount: 50000, anon: true },
        { amount: 20000, publicName: 'Microbe Watch', anon: false },
        { amount: 10000, anon: true },
        { amount: 5000, anon: true },
      ],
    },

    // 5. Education - FUNDING (60%)
    {
      id: CAMPAIGNS.coding,
      creatorId: USERS.creator,
      status: CampaignStatus.FUNDING,
      title: 'Free After-School Coding for Every Kid',
      category: Category.EDUCATION,
      creatorName: 'Lantern Learning',
      creatorType: CreatorType.COMMUNITY,
      summary:
        'Sponsoring localized ads to recruit volunteer engineers and enroll middle school students in zero-cost weekend Python clubs.',
      coverUrl:
        'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
      fallbackImageUrl:
        'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=400&q=60',
      fundingGoalCents: 500000,
      raisedCents: 300000, // $3,000.00
      startsAt: daysAgo(10),
      endsAt: daysAhead(20),
      submittedAt: daysAgo(12),
      publishedAt: daysAgo(10),
      version: 1,
      story: [
        {
          type: 'heading',
          level: 1,
          text: 'Democratizing Computer Science in Neighborhood Libraries',
        },
        {
          type: 'paragraph',
          text: 'Early computer literacy remains deeply stratified by zip code. While private academies charge thousands, public branch libraries have idle computer labs every Saturday afternoon.',
        },
        {
          type: 'stat',
          value: '420+',
          label: 'Students graduated from community Saturday clubs since 2024',
          source: 'Lantern Learning Annual Progress Report',
        },
        {
          type: 'actions',
          items: [
            'Sign up a middle-schooler for free Saturday classes',
            'Volunteer 2 hours a month as a coding mentor',
          ],
        },
      ],
      sources: [
        {
          title: 'Code.org State of Computer Science Education',
          url: 'https://advocacy.code.org/stateofcs',
          publisher: 'Code.org Advocacy Coalition',
          isDemo: true,
        },
      ],
      adCreative: {
        headline: 'Free Weekend Coding Clubs for Kids',
        description: 'Hosted at local branch libraries. Laptops provided. Zero tuition forever.',
        cta: 'Enroll Free Today',
        images: [
          'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80',
        ],
      },
      reach: {
        locations: ['Atlanta Metro Area', 'Fulton County, GA'],
        interests: ['STEM Education', 'Parenting', 'Public Libraries'],
        channels: ['Meta Feed', 'Google Search'],
        budgetAllocation: { meta: 0.5, google: 0.5 },
        durationDays: 30,
      },
      contributions: [
        { amount: 150000, publicName: 'Tech For Youth', anon: false },
        { amount: 75000, anon: true },
        { amount: 50000, anon: true },
        { amount: 25000, publicName: 'Alice Wang', anon: false },
      ],
    },

    // 6. Economic Policy - FUNDING (12%)
    {
      id: CAMPAIGNS.mainStreet,
      creatorId: USERS.sarah,
      status: CampaignStatus.FUNDING,
      title: 'Small Shops, Big Shifts: Local Spending',
      category: Category.ECONOMIC_POLICY,
      creatorName: 'Main Street Alliance',
      creatorType: CreatorType.NONPROFIT,
      summary:
        'Campaigning to redirect 10% of municipal procurement towards independent neighborhood suppliers and storefronts.',
      coverUrl:
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
      fallbackImageUrl:
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=400&q=60',
      fundingGoalCents: 750000,
      raisedCents: 90000, // $900.00
      startsAt: daysAgo(5),
      endsAt: daysAhead(25),
      submittedAt: daysAgo(7),
      publishedAt: daysAgo(5),
      version: 1,
      story: [
        {
          type: 'heading',
          level: 1,
          text: 'The Economic Multiplier of Independent Main Streets',
        },
        {
          type: 'paragraph',
          text: 'For every $100 spent at an independent local merchant, approximately $68 remains in the local municipal economy, compared to just $43 when spent at national conglomerate retailers.',
        },
        {
          type: 'stat',
          value: '$0.68 / $1',
          label: 'Retained locally when purchasing from neighborhood independent merchants',
          source: 'American Independent Business Alliance Study',
        },
        {
          type: 'actions',
          items: [
            'Support the Municipal Local Procurement Charter',
            'Find verified independent merchants in your neighborhood',
          ],
        },
      ],
      sources: [
        {
          title: 'The Local Economic Multiplier Effect: Retail Trade',
          url: 'https://ilsr.org/key-studies-why-local-matters/',
          publisher: 'Institute for Local Self-Reliance',
          isDemo: true,
        },
      ],
      adCreative: {
        headline: 'Keep Your Dollars on Main Street',
        description: 'See the verified economic data on how local spending funds neighborhood parks.',
        cta: 'Read Economic Brief',
        images: [
          'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
        ],
      },
      reach: {
        locations: ['Cleveland Metro', 'Cuyahoga County, OH'],
        interests: ['Small Business', 'Local Economy', 'Community Development'],
        channels: ['Meta Feed', 'LinkedIn Local'],
        budgetAllocation: { meta: 0.6, linkedin: 0.4 },
        durationDays: 30,
      },
      contributions: [
        { amount: 50000, anon: true },
        { amount: 25000, anon: true },
        { amount: 15000, publicName: 'Downtown Merchants', anon: false },
      ],
    },

    // 7. Community - FUNDING (93.3% - Ending in 2.5 days!)
    {
      id: CAMPAIGNS.crosswalk,
      creatorId: USERS.creator,
      status: CampaignStatus.FUNDING,
      title: 'Block Party for Safer Crosswalks',
      category: Category.COMMUNITY,
      creatorName: 'Maple Ave Neighbors',
      creatorType: CreatorType.COMMUNITY,
      summary:
        'Urgent push to fund raised crosswalk awareness ads before the upcoming DOT capital budget deadline this Friday.',
      coverUrl:
        'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80',
      fallbackImageUrl:
        'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=400&q=60',
      fundingGoalCents: 150000,
      raisedCents: 140000, // $1,400.00 (93.3%)
      startsAt: daysAgo(27),
      endsAt: daysAhead(2.5), // Ending in 2.5 days!
      submittedAt: daysAgo(30),
      publishedAt: daysAgo(27),
      version: 1,
      story: [
        {
          type: 'heading',
          level: 1,
          text: 'Protecting Elementary Walkers on Maple Avenue',
        },
        {
          type: 'paragraph',
          text: 'Maple Avenue connects two elementary schools and a public park, yet lacks a single raised traffic-calming crosswalk across a 1.2-mile arterial stretch.',
        },
        {
          type: 'stat',
          value: '45% Reduction',
          label: 'In pedestrian crashes following installation of raised intersections',
          source: 'Federal Highway Administration Safety Analysis',
        },
        {
          type: 'actions',
          items: [
            'Sign the Maple Avenue Traffic Safety Petition',
            'Attend Thursday evening DOT Community Forum',
          ],
        },
      ],
      sources: [
        {
          title: 'FHWA Proven Safety Countermeasures: Raised Crosswalks',
          url: 'https://highways.dot.gov/safety/proven-safety-countermeasures/raised-crosswalk',
          publisher: 'Federal Highway Administration',
          isDemo: true,
        },
      ],
      adCreative: {
        headline: '48 Hours Left: Safe Streets for Maple Ave',
        description: 'Urge the Department of Transportation to fund raised crosswalks before the vote.',
        cta: 'Sign Safety Petition',
        images: [
          'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80',
        ],
      },
      reach: {
        locations: ['East Nashville, TN'],
        interests: ['Parenting', 'Pedestrian Safety', 'Local Neighborhood'],
        channels: ['Meta Feed', 'Nextdoor Local'],
        budgetAllocation: { meta: 0.5, nextdoor: 0.5 },
        durationDays: 30,
      },
      contributions: [
        { amount: 60000, publicName: 'Neighborhood Council', anon: false },
        { amount: 40000, anon: true },
        { amount: 20000, anon: true },
        { amount: 10000, anon: true },
        { amount: 10000, publicName: 'Crosswalk Coalition', anon: false },
      ],
    },

    // 8. Arts & Culture - FUNDING (8%)
    {
      id: CAMPAIGNS.looms,
      creatorId: USERS.david,
      status: CampaignStatus.FUNDING,
      title: 'Lost Looms: Saving Handwoven Textiles',
      category: Category.ARTS_AND_CULTURE,
      creatorName: 'Threadline Studio',
      creatorType: CreatorType.BUSINESS,
      summary:
        'Documentary and explainer ads highlighting indigenous Appalachian jacquard weaving techniques facing generational loss.',
      coverUrl:
        'https://images.unsplash.com/photo-1606744824163-985d376605aa?auto=format&fit=crop&w=1200&q=80',
      fallbackImageUrl:
        'https://images.unsplash.com/photo-1606744824163-985d376605aa?auto=format&fit=crop&w=400&q=60',
      fundingGoalCents: 250000,
      raisedCents: 20000, // $200.00 (8%)
      startsAt: daysAgo(3),
      endsAt: daysAhead(27),
      submittedAt: daysAgo(5),
      publishedAt: daysAgo(3),
      version: 1,
      story: [
        {
          type: 'heading',
          level: 1,
          text: 'Preserving Appalachian Heritage Weaving for the Next Generation',
        },
        {
          type: 'paragraph',
          text: 'Fewer than twelve master weavers remain in the Southern Appalachian highlands who can operate traditional four-harness timber floor looms without digital schematics.',
        },
        {
          type: 'stat',
          value: '180 Years',
          label: 'Continuous lineage of oral weaving patterns currently undocumented',
          source: 'Appalachian Traditional Craft Archives',
        },
      ],
      sources: [
        {
          title: 'Preserving Intangible Cultural Craft Heritage',
          url: 'https://ich.unesco.org/en/traditional-craftsmanship-00057',
          publisher: 'UNESCO Intangible Cultural Heritage',
          isDemo: true,
        },
      ],
      adCreative: {
        headline: 'Save Living Appalachian Folk Art',
        description: 'See the masters keeping centuries-old timber looms alive. Watch the documentary.',
        cta: 'Watch Folk Story',
        images: [
          'https://images.unsplash.com/photo-1606744824163-985d376605aa?auto=format&fit=crop&w=800&q=80',
        ],
      },
      reach: {
        locations: ['Asheville, NC', 'Knoxville, TN'],
        interests: ['Textile Arts', 'Craftsmanship', 'Appalachian History'],
        channels: ['Meta Feed', 'Instagram'],
        budgetAllocation: { meta: 0.5, instagram: 0.5 },
        durationDays: 30,
      },
      contributions: [
        { amount: 15000, anon: true },
        { amount: 5000, publicName: 'Heritage Weavers', anon: false },
      ],
    },

    // 9. Business - FUNDING (51.4%)
    {
      id: CAMPAIGNS.bookstore,
      creatorId: USERS.sarah,
      status: CampaignStatus.FUNDING,
      title: 'Fair Pricing for Independent Bookstores',
      category: Category.BUSINESS,
      creatorName: 'Pagewise Books',
      creatorType: CreatorType.BUSINESS,
      summary:
        'Advocating for anti-monopoly publisher wholesale discounts so brick-and-mortar neighborhood bookshops can thrive.',
      coverUrl:
        'https://images.unsplash.com/photo-1526243741027-444d633d7365?auto=format&fit=crop&w=1200&q=80',
      fallbackImageUrl:
        'https://images.unsplash.com/photo-1526243741027-444d633d7365?auto=format&fit=crop&w=400&q=60',
      fundingGoalCents: 350000,
      raisedCents: 180000, // $1,800.00
      startsAt: daysAgo(14),
      endsAt: daysAhead(16),
      submittedAt: daysAgo(16),
      publishedAt: daysAgo(14),
      version: 1,
      story: [
        {
          type: 'heading',
          level: 1,
          text: 'Why Independent Bookshops Need a Level Playing Field',
        },
        {
          type: 'paragraph',
          text: 'E-commerce monopolists extract massive 55%+ wholesale discounts from major publishers while independent shops pay 40% wholesale, squeezing physical community hubs out of downtowns.',
        },
        {
          type: 'stat',
          value: '2,100+',
          label: 'Independent bookstores acting as civic community anchors across America',
          source: 'American Booksellers Association Industry Report',
        },
      ],
      sources: [
        {
          title: 'Antitrust Review: Monopsony Power in Commercial Book Retailing',
          url: 'https://www.justice.gov/atr',
          publisher: 'Department of Justice Antitrust Division',
          isDemo: true,
        },
      ],
      adCreative: {
        headline: 'Protect Your Corner Bookstore',
        description: 'Discover how discriminatory wholesale pricing threatens independent bookshops.',
        cta: 'Read Policy Brief',
        images: [
          'https://images.unsplash.com/photo-1526243741027-444d633d7365?auto=format&fit=crop&w=800&q=80',
        ],
      },
      reach: {
        locations: ['Portland, OR', 'Seattle, WA'],
        interests: ['Books', 'Literature', 'Local Business'],
        channels: ['Meta Feed', 'Google Display'],
        budgetAllocation: { meta: 0.6, google: 0.4 },
        durationDays: 30,
      },
      contributions: [
        { amount: 100000, anon: true },
        { amount: 50000, publicName: 'Indie Authors Collective', anon: false },
        { amount: 30000, anon: true },
      ],
    },

    // 10. Other - COMPLETED with Report (100%)
    {
      id: CAMPAIGNS.cleanEnergy,
      creatorId: USERS.creator,
      status: CampaignStatus.COMPLETED,
      title: 'Clean Energy Transparency for All',
      category: Category.OTHER,
      creatorName: 'Maya Lin',
      creatorType: CreatorType.INDIVIDUAL,
      summary:
        'Historic campaign amplifying residential solar billing rights and utility net-metering protections.',
      coverUrl:
        'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
      fallbackImageUrl:
        'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=400&q=60',
      fundingGoalCents: 400000,
      raisedCents: 400000, // $4,000.00
      startsAt: daysAgo(60),
      endsAt: daysAgo(30),
      submittedAt: daysAgo(65),
      publishedAt: daysAgo(60),
      version: 1,
      story: [
        {
          type: 'heading',
          level: 1,
          text: 'Demystifying Rooftop Solar Interconnection Rights',
        },
        {
          type: 'paragraph',
          text: 'Regional utility monopolies frequently impose 9-month administrative delays on grid-connecting residential solar installations. This campaign funded statewide explainer ads linking homeowners to utility commission complaint portals.',
        },
      ],
      sources: [
        {
          title: 'Federal Energy Regulatory Commission Interconnection Standards',
          url: 'https://www.ferc.gov/electric/industry-activities/generator-interconnection',
          publisher: 'Federal Energy Regulatory Commission',
          isDemo: true,
        },
      ],
      adCreative: {
        headline: 'Know Your Solar Interconnection Rights',
        description: 'Utilities must connect residential solar within statutory deadlines. Learn the rules.',
        cta: 'Check State Rules',
        images: [
          'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
        ],
      },
      reach: {
        locations: ['Arizona', 'Nevada'],
        interests: ['Clean Energy', 'Solar Power', 'Home Improvement'],
        channels: ['Google Search', 'Meta Feed'],
        budgetAllocation: { google: 0.6, meta: 0.4 },
        durationDays: 30,
      },
      report: {
        fundsRaisedCents: 400000,
        adSpendCents: 360000,
        impressions: 602500,
        reach: 271800,
        reachType: ReachType.MEASURED,
        clicks: 14460,
        ctr: 2.4,
        startedAt: daysAgo(30),
        endedAt: daysAgo(2),
        isDemo: true,
      },
      contributions: [
        { amount: 200000, anon: true },
        { amount: 100000, publicName: 'Solar Advocates', anon: false },
        { amount: 50000, anon: true },
        { amount: 30000, anon: true },
        { amount: 20000, anon: true },
      ],
    },

    // 11. DRAFT - Demo Creator user (steps 1 & 2 complete)
    {
      id: CAMPAIGNS.creatorDraft,
      creatorId: USERS.creator,
      status: CampaignStatus.DRAFT,
      title: 'Civic Tech Hackers: Public Records Access',
      category: Category.PUBLIC_POLICY,
      creatorName: 'Maya Lin',
      creatorType: CreatorType.CREATOR,
      summary:
        'A statewide FOIA advocacy campaign providing templates and legal rights explainers to investigative journalists.',
      coverUrl:
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
      fallbackImageUrl:
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=60',
      fundingGoalCents: 200000,
      raisedCents: 0,
      version: 1,
      story: [
        {
          type: 'heading',
          level: 1,
          text: 'Public Records Belong to the Public',
        },
        {
          type: 'paragraph',
          text: 'Drafting steps 1 and 2 are saved. Visuals and targeting settings will be finalized prior to formal submission.',
        },
      ],
      sources: [
        {
          title: 'Reporters Committee for Freedom of the Press: Open Government Guide',
          url: 'https://www.rcfp.org/open-government-guide/',
          publisher: 'RCFP',
          isDemo: true,
        },
      ],
      adCreative: null,
      reach: null,
      contributions: [],
    },

    // 12. SUBMITTED - Demo Creator user (Awaiting admin review)
    {
      id: CAMPAIGNS.creatorSubmitted,
      creatorId: USERS.creator,
      status: CampaignStatus.SUBMITTED,
      title: 'Community Composting Hub for Ward 4',
      category: Category.ENVIRONMENT,
      creatorName: 'Maya Lin',
      creatorType: CreatorType.COMMUNITY,
      summary:
        'Expanding residential food scrap drop-offs across Ward 4 parks to divert organic waste from city landfills.',
      coverUrl:
        'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80',
      fallbackImageUrl:
        'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=60',
      fundingGoalCents: 300000,
      raisedCents: 0,
      submittedAt: daysAgo(1),
      version: 1,
      story: [
        {
          type: 'heading',
          level: 1,
          text: 'Diverting 40 Tons of Organic Waste in Ward 4',
        },
        {
          type: 'paragraph',
          text: 'Over 30% of municipal landfill mass is compostable food waste that generates methane when trapped without oxygen.',
        },
      ],
      sources: [
        {
          title: 'EPA Food Waste Research & Methane Emissions Analysis',
          url: 'https://www.epa.gov/land-research/quantifying-methane-emissions-landfilled-food-waste',
          publisher: 'EPA Research Publications',
          isDemo: true,
        },
      ],
      adCreative: {
        headline: 'Drop Your Food Scraps in Ward 4',
        description: 'New weekend community compost drop-off bins opening at 3 neighborhood parks.',
        cta: 'Find Nearest Bin',
        images: [
          'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
        ],
      },
      reach: {
        locations: ['Ward 4, Washington DC'],
        interests: ['Composting', 'Zero Waste', 'Urban Gardening'],
        channels: ['Meta Feed', 'Local Posters'],
        budgetAllocation: { meta: 0.8, local: 0.2 },
        durationDays: 30,
      },
      contributions: [],
    },

    // 13. CHANGES_REQUESTED - Demo Creator user (with reviewer notes and ReviewDecision)
    {
      id: CAMPAIGNS.creatorChanges,
      creatorId: USERS.creator,
      status: CampaignStatus.CHANGES_REQUESTED,
      title: 'Neighborhood Air Quality Sensors Network',
      category: Category.HEALTH,
      creatorName: 'Maya Lin',
      creatorType: CreatorType.NONPROFIT,
      summary:
        'Crowdsourcing calibrated outdoor particulate matter sensors along interstate highway school perimeters.',
      coverUrl:
        'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=1200&q=80',
      fallbackImageUrl:
        'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=400&q=60',
      fundingGoalCents: 250000,
      raisedCents: 0,
      submittedAt: daysAgo(4),
      reviewNotes:
        'Please provide a verifiable secondary source for particulate matter claims in paragraph 2 and shorten the ad headline to under 40 characters.',
      version: 1,
      story: [
        {
          type: 'heading',
          level: 1,
          text: 'Real-Time Air Quality Monitoring for Highway-Adjacent Classrooms',
        },
        {
          type: 'paragraph',
          text: 'Children attending schools situated within 500 feet of major interstate freight corridors experience significantly higher rates of respiratory hospitalizations.',
        },
      ],
      sources: [
        {
          title: 'Health Effects Institute: Traffic-Related Air Pollution',
          url: 'https://www.healtheffects.org',
          publisher: 'Health Effects Institute Special Report',
          isDemo: true,
        },
      ],
      adCreative: {
        headline: 'Monitor Air Quality Near Local Schools',
        description: 'See live particulate readings from real-time community highway sensors.',
        cta: 'View Live Map',
        images: [
          'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=800&q=80',
        ],
      },
      reach: {
        locations: ['Oakland, CA', 'I-880 Corridor'],
        interests: ['Clean Air', 'Child Health', 'Environmental Justice'],
        channels: ['Meta Feed', 'Google Search'],
        budgetAllocation: { meta: 0.7, google: 0.3 },
        durationDays: 30,
      },
      reviewDecision: {
        decision: ReviewDecisionType.CHANGES_REQUESTED,
        reviewerId: USERS.admin,
        notes:
          'Please provide a verifiable secondary source for particulate matter claims in paragraph 2 and shorten the ad headline to under 40 characters.',
      },
      contributions: [],
    },
  ];

  let totalContributionsSeeded = 0;

  for (const c of campaignsData) {
    const { contributions, report, reviewDecision, ...campaignFields } = c;

    // Upsert Campaign
    await prisma.campaign.upsert({
      where: { id: campaignFields.id },
      update: {
        ...campaignFields,
      },
      create: {
        ...campaignFields,
      },
    });

    // Handle Review Decision if present
    if (reviewDecision) {
      await prisma.reviewDecision.deleteMany({
        where: { campaignId: campaignFields.id },
      });
      await prisma.reviewDecision.create({
        data: {
          campaignId: campaignFields.id,
          reviewerId: reviewDecision.reviewerId,
          decision: reviewDecision.decision,
          notes: reviewDecision.notes,
        },
      });
    }

    // Handle Report if present
    if (report) {
      await prisma.report.upsert({
        where: { campaignId: campaignFields.id },
        update: { ...report },
        create: {
          campaignId: campaignFields.id,
          ...report,
        },
      });
    }

    // Clean and re-seed Contributions for idempotency
    await prisma.contribution.deleteMany({
      where: { campaignId: campaignFields.id },
    });

    if (contributions && contributions.length > 0) {
      let receiptCounter = 1;
      let calculatedSum = 0;

      for (const contrib of contributions) {
        const fees = quote(contrib.amount);
        const receiptNo = `RCP-${campaignFields.id.slice(0, 4).toUpperCase()}-${String(receiptCounter).padStart(4, '0')}`;
        receiptCounter++;
        calculatedSum += contrib.amount;

        await prisma.contribution.create({
          data: {
            campaignId: campaignFields.id,
            userId: contrib.user ?? null,
            guestEmail: contrib.user ? null : 'supporter@demo.org',
            guestReceiptToken: `token-${receiptNo.toLowerCase()}`,
            amountCents: contrib.amount,
            feeCents: fees.processingFeeCents,
            totalCents: fees.totalCents,
            status: ContributionStatus.SUCCEEDED,
            isAnonymous: contrib.anon ?? true,
            publicName: contrib.publicName ?? null,
            receiptNo,
            isDemo: true,
          },
        });
        totalContributionsSeeded++;
      }

      // Sanity check in seed loop
      if (calculatedSum !== campaignFields.raisedCents) {
        throw new Error(
          `Seed data mismatch for ${campaignFields.title}: raisedCents (${campaignFields.raisedCents}) does not match contribution sum (${calculatedSum})`
        );
      }
    }
  }

  console.log(`✓ Seeded ${campaignsData.length} campaigns across all 10 categories`);
  console.log(`✓ Seeded ${totalContributionsSeeded} contributions with exact mathematical match to raisedCents`);

  // 3. Seed updates, audit events, notifications, follows, and saves
  await prisma.campaignUpdate.deleteMany();
  await prisma.campaignUpdate.createMany({
    data: [
      {
        campaignId: CAMPAIGNS.water,
        title: 'Initial 200 Sampling Kits Distributed to Local Schools',
        body: 'Thanks to the first wave of community contributions, our mobile testing awareness ads reached over 18,000 residents this past week. The state lab has received 142 water samples for verification.',
        createdAt: daysAgo(5),
      },
      {
        campaignId: CAMPAIGNS.rooftop,
        title: 'Voucher Explainer Campaign Live Across All 14 Districts',
        body: 'With 100% of the distribution budget funded, targeted digital explainer units are now reaching district facility managers and parent-teacher associations.',
        createdAt: daysAgo(2),
      },
    ],
  });

  await prisma.campaignEvent.deleteMany();
  await prisma.campaignEvent.createMany({
    data: [
      {
        campaignId: CAMPAIGNS.water,
        type: 'STATUS_TRANSITION',
        payload: { from: 'APPROVED', to: 'FUNDING' },
        createdAt: daysAgo(18),
      },
      {
        campaignId: CAMPAIGNS.water,
        type: 'MILESTONE_REACHED',
        payload: { percent: 75, raisedCents: 112500 },
        createdAt: daysAgo(1),
      },
      {
        campaignId: CAMPAIGNS.creatorChanges,
        type: 'REVIEW_DECISION',
        payload: { decision: 'CHANGES_REQUESTED' },
        createdAt: daysAgo(2),
      },
    ],
  });

  await prisma.notification.deleteMany();
  await prisma.notification.createMany({
    data: [
      {
        userId: USERS.creator,
        type: 'REVIEW_DECISION',
        title: 'Review Update: Changes Requested',
        body: 'Reviewers left notes on "Neighborhood Air Quality Sensors Network". Please review citations.',
        campaignId: CAMPAIGNS.creatorChanges,
        createdAt: daysAgo(2),
      },
      {
        userId: USERS.creator,
        type: 'CAMPAIGN_MILESTONE',
        title: '75% Funding Milestone Reached!',
        body: 'Your campaign "Clean Drinking Water in Jackson, MS" has reached $1,125 of its $1,500 ad distribution goal.',
        campaignId: CAMPAIGNS.water,
        createdAt: daysAgo(1),
      },
      {
        userId: USERS.backer,
        type: 'CONTRIBUTION_CONFIRMED',
        title: 'Contribution Recorded',
        body: 'Your contribution to "Clean Drinking Water in Jackson, MS" has been processed. Ad distribution will launch upon goal completion.',
        campaignId: CAMPAIGNS.water,
        readAt: daysAgo(1),
        createdAt: daysAgo(3),
      },
    ],
  });

  await prisma.follow.deleteMany();
  await prisma.follow.createMany({
    data: [
      { userId: USERS.backer, campaignId: CAMPAIGNS.water },
      { userId: USERS.backer, campaignId: CAMPAIGNS.rooftop },
      { userId: USERS.creator, campaignId: CAMPAIGNS.openData },
    ],
  });

  await prisma.savedCampaign.deleteMany();
  await prisma.savedCampaign.createMany({
    data: [
      { userId: USERS.backer, campaignId: CAMPAIGNS.water },
      { userId: USERS.backer, campaignId: CAMPAIGNS.crosswalk },
    ],
  });

  await prisma.feedback.deleteMany();
  await prisma.feedback.createMany({
    data: [
      {
        campaignId: CAMPAIGNS.water,
        userId: USERS.backer,
        visualsEncouraged: FeedbackResponse.YES,
        messageChanged: FeedbackResponse.SOMEWHAT,
      },
      {
        campaignId: CAMPAIGNS.rooftop,
        userId: USERS.sarah,
        visualsEncouraged: FeedbackResponse.YES,
        messageChanged: FeedbackResponse.YES,
      },
    ],
  });

  console.log('✓ Seeded campaign updates, audit events, notifications, follows, saves, and feedback');
  console.log('Database seeding successfully finished!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
