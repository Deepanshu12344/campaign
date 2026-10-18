export interface FaqItem {
  id: string;
  category: 'Basics' | 'Backing & Payments' | 'Creating & Editing' | 'Reach & Reports' | 'Privacy & Security';
  question: string;
  answer: string;
}

export interface HelpTopicLink {
  id: string;
  title: string;
  description: string;
  targetRoute: string;
  actionLabel: string;
}

export interface LegalSection {
  title: string;
  paragraphs: string[];
}

export const FAQ_ITEMS: FaqItem[] = [
  // 1. Basics
  {
    id: 'is-this-a-donation',
    category: 'Basics',
    question: 'Is this a donation?',
    answer:
      'No. Your contribution pays to spread this message. It is NOT a donation to the cause or the creator. 100% of the net funds strictly purchase digital advertising impressions across online feeds, search, and networks to amplify the campaign narrative.',
  },
  {
    id: 'is-data-real',
    category: 'Basics',
    question: 'Is the data on this app real?',
    answer: 'This is a prototype. Campaigns, amounts and results shown are samples.',
  },
  {
    id: 'what-do-fees-pay-for',
    category: 'Basics',
    question: 'What do fees pay for?',
    answer:
      'Campaigns applies a flat, transparent 10% platform fee. This covers editorial review, citation verification, platform infrastructure, and payment processing fees. The remaining 90% is dedicated strictly to direct advertising spend.',
  },
  {
    id: 'why-does-campaigns-exist',
    category: 'Basics',
    question: 'Why does Campaigns exist?',
    answer:
      'Grassroots causes, investigative journalists, and civic advocates rarely have the capital to run large digital advertising campaigns. Campaigns democratizes media distribution so that important public interest messages can reach audiences beyond the creator’s own social followers.',
  },

  // 2. Backing & Payments
  {
    id: 'can-i-back-without-an-account',
    category: 'Backing & Payments',
    question: 'Can I back without an account?',
    answer:
      'Yes! Guest checkout is fully supported. When backing as a guest, you only provide an email address, and a cryptographic guest receipt token is stored securely on your device so you can view your contribution receipt at any time.',
  },
  {
    id: 'how-do-refunds-work',
    category: 'Backing & Payments',
    question: 'How do refunds work?',
    answer:
      'If a campaign fails to reach its minimum funding goal before its deadline expires, advertising cannot run. In that case, all contributions are automatically marked for refund back to backers without platform fee deductions.',
  },
  {
    id: 'what-happens-to-unspent-funds',
    category: 'Backing & Payments',
    question: 'What happens to unspent funds?',
    answer:
      'If digital advertising completes under budget or if delivery is interrupted, any unspent ad budget is accounted for in the verified final report and returned to backers according to our refund policies.',
  },

  // 3. Creating & Editing
  {
    id: 'how-are-campaigns-reviewed',
    category: 'Creating & Editing',
    question: 'How are campaigns reviewed?',
    answer:
      'Every campaign must pass a rigorous 4-point editorial review before publication: 1) Truthfulness and community standards of the narrative, 2) Authenticity of external publisher citations, 3) Digital advertising compliance of image assets and copy, and 4) Legality and appropriateness of geographic and audience targeting.',
  },
  {
    id: 'can-i-edit-after-published',
    category: 'Creating & Editing',
    question: 'Can I edit a campaign after it is published?',
    answer:
      'Posting public campaign updates does not require re-review. However, changes to your core story, sources, ad creative, or audience targeting must be submitted as a revision and approved by a reviewer before live ads are updated.',
  },
  {
    id: 'why-cant-i-see-my-campaign-yet',
    category: 'Creating & Editing',
    question: "Why can't I see my campaign yet?",
    answer:
      'Immediately after submitting, your campaign enters the review queue with status "Under Review". It will not appear publicly on Explore or accept contributions until our compliance team verifies your claims and approves the submission.',
  },

  // 4. Reach & Reports
  {
    id: 'how-is-reach-estimated',
    category: 'Reach & Reports',
    question: 'How is reach estimated?',
    answer:
      'Estimated reach is modeled using industry-standard Cost Per Mille (CPM) benchmarks across your selected channels (social, search, display, video) and target regions. For example, a $6 CPM model predicts ~166,000 impressions per $1,000 in net media spend.',
  },
  {
    id: 'what-does-estimated-reach-mean',
    category: 'Reach & Reports',
    question: 'What does "estimated reach" mean?',
    answer:
      'Estimated reach is an uncommitted statistical projection designed to give creators and backers an approximate sense of scale. It is NEVER a promise, contract, or guarantee of audience size, because ad network auction bids fluctuate.',
  },
  {
    id: 'estimated-vs-measured-reach',
    category: 'Reach & Reports',
    question: 'What is the difference between estimated and measured reach?',
    answer:
      'Estimated reach is a pre-campaign mathematical projection. Measured reach is verified, deduplicated audience delivery reported directly by ad networks after live impressions are served. These two numbers are strictly separated in all performance reporting.',
  },

  // 5. Privacy & Security
  {
    id: 'is-my-name-public',
    category: 'Privacy & Security',
    question: 'Is my name public?',
    answer:
      'No. Backer names and email addresses are private by default. They are never published on public campaign pages, never shared with ad viewers, and never sold to third-party marketing brokers.',
  },
  {
    id: 'are-payment-cards-stored',
    category: 'Privacy & Security',
    question: 'Are my payment card details stored?',
    answer:
      'No. Payment card numbers are never stored on platform servers. Contributions are processed using tokenized payment gateways, and guest receipt tokens are stored locally on your device.',
  },
];

export function filterFaqs(query: string, faqs: FaqItem[] = FAQ_ITEMS): FaqItem[] {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return faqs;

  return faqs.filter(
    (item) =>
      item.question.toLowerCase().includes(cleanQuery) ||
      item.answer.toLowerCase().includes(cleanQuery) ||
      item.category.toLowerCase().includes(cleanQuery)
  );
}

export const HELP_PROBLEMS: HelpTopicLink[] = [
  {
    id: 'payment-issue',
    title: 'Payment Failed or Card Declined',
    description: 'Ensure international e-commerce is enabled or try a different card.',
    targetRoute: '/info/faqs',
    actionLabel: 'Check Payment FAQs',
  },
  {
    id: 'receipt-lookup',
    title: "Can't Find My Contribution Receipt",
    description: 'View receipts for signed-in accounts or locate your guest receipt token.',
    targetRoute: '/profile/payments',
    actionLabel: 'Open Payment History',
  },
  {
    id: 'changes-requested',
    title: 'Campaign Requires Revisions During Review',
    description: 'Inspect reviewer feedback notes, modify your draft, and resubmit.',
    targetRoute: '/creator/dashboard',
    actionLabel: 'Go to Creator Dashboard',
  },
  {
    id: 'report-content',
    title: 'Report Deceptive or Misleading Content',
    description: 'Review our community standards or submit a moderation flag.',
    targetRoute: '/info/community-guidelines',
    actionLabel: 'Read Guidelines',
  },
  {
    id: 'create-guidance',
    title: 'Need Help Structuring a Campaign',
    description: 'Learn how to formulate strong claims, attach sources, and set realistic goals.',
    targetRoute: '/info/how-it-works',
    actionLabel: 'View How It Works',
  },
  {
    id: 'direct-support',
    title: 'Direct Platform & Account Assistance',
    description: 'Reach our support and operations team directly with specific inquiries.',
    targetRoute: '/info/contact',
    actionLabel: 'Contact Support Team',
  },
];

export const DEMO_PARTNERS = [
  {
    id: 'partner-global-ad-exchange',
    name: 'Global Ad Exchange Network',
    role: 'Multi-Channel Programmatic Exchange',
    description:
      'Automated real-time bidding infrastructure serving banner and native sponsored placements across major digital news outlets and content feeds.',
  },
  {
    id: 'partner-civic-display',
    name: 'Civic Media Display Registry',
    role: 'Contextual News & Display Syndication',
    description:
      'Curated network of regional publications and independent journalism outlets supporting transparent public interest issue advertising.',
  },
  {
    id: 'partner-video-stream',
    name: 'Digital Stream & Feed Syndication',
    role: 'Mobile Video & Feed Placements',
    description:
      'High-engagement video and social feed delivery platform designed for multimedia visual campaigns requiring targeted regional distribution.',
  },
  {
    id: 'partner-audio-network',
    name: 'Civic Audio & Podcast Network',
    role: 'Streaming Audio & Podcast Sponsorships',
    description:
      'Dynamic audio insertion network delivering public interest announcements across educational, civic, and community podcasts.',
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: '1. Non-Donation Nature of Contributions',
    paragraphs: [
      'Contributions made through Campaigns are strictly dedicated to funding digital advertising media distribution to amplify the campaign message to external audiences.',
      'Contributions do NOT constitute tax-deductible charitable donations, investments, equity purchases, or direct financial gifts to campaign creators. 100% of net backer funds are committed to purchasing digital advertising impressions.',
    ],
  },
  {
    title: '2. Platform Fees and Ad Budget Commitment',
    paragraphs: [
      'Campaigns deducts a flat, transparent 10% platform fee from gross funding to cover human editorial review, citation verification, platform infrastructure, and payment processing fees.',
      'The remaining 90% of funds is held in escrow and applied strictly toward purchasing media inventory from verified advertising networks. Platform fees are only earned upon successful campaign funding.',
    ],
  },
  {
    title: '3. Editorial Review and the Right to Reject',
    paragraphs: [
      'All campaigns submitted to the platform are subject to human and automated review prior to publication and distribution.',
      'Campaigns reserves the unconditional right to reject, return for revision, suspend, or terminate any campaign that violates truthfulness standards, promotes hate speech or harassment, contains deceptive claims, or fails to provide verifiable supporting evidence.',
    ],
  },
  {
    title: '4. Funding Goals and Refund Conditions',
    paragraphs: [
      'Campaigns operates on an all-or-nothing distribution threshold. If a campaign fails to reach its creator-set funding goal prior to its deadline, advertising delivery will not proceed.',
      'In the event of an unreached goal, all backer contributions are marked for automatic refund without deduction of platform fees. Unspent media budgets from completed distributions are similarly refunded or credited in accordance with published performance reports.',
    ],
  },
  {
    title: '5. Creator Warranties and Licensing',
    paragraphs: [
      'Creators warrant that all narrative claims of fact are accurate and substantiated by cited sources, and that all uploaded imagery and video assets comply with digital advertising policies.',
      'By submitting a campaign, creators grant Campaigns a non-exclusive license to format, distribute, and serve campaign media assets across advertising exchange networks for the sole purpose of executing campaign promotion.',
    ],
  },
  {
    title: '6. Prototype Demonstration Terms',
    paragraphs: [
      'This is a prototype. Campaigns, amounts and results shown are samples.',
    ],
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: '1. Private Backer Identity by Default',
    paragraphs: [
      'Your privacy is fundamental to our architecture. Backer names, email addresses, and specific pledge amounts are private by default.',
      'Backer identities are never displayed on public campaign pages, never shared with ad viewers who see campaign promotions, and never sold to third-party advertisers or data brokers.',
    ],
  },
  {
    title: '2. Information We Collect',
    paragraphs: [
      'For registered users, we collect an email address, display name, and authentication credentials. For creators, we collect campaign narratives, media assets, and verified source citations.',
      'For guest backers, we collect solely an email address required for delivering transactional contribution receipts. We do not require account creation to browse, explore, or back campaigns.',
    ],
  },
  {
    title: '3. Zero Payment Card Storage',
    paragraphs: [
      'Campaigns does not collect, process, or store credit or debit card numbers on platform servers.',
      'All payment card transactions are handled through secure, PCI-DSS compliant payment tokenization providers. Guest contributors receive encrypted receipt tokens stored locally within device secure storage.',
    ],
  },
  {
    title: '4. Guest Receipt Tokens and Device Storage',
    paragraphs: [
      'When backing without an account, a cryptographic guest receipt token is stored in your device’s secure local storage (Expo SecureStore on mobile or encrypted localStorage on web).',
      'This token enables you to retrieve your verified receipt and view campaign progress without transmitting personal credentials to our servers.',
    ],
  },
  {
    title: '5. Telemetry and Aggregate Reporting',
    paragraphs: [
      'Advertising performance reports disclose aggregate delivery metrics only (impressions, clicks, cost-per-click, and measured reach). Reports never identify individual contributors or ad recipients.',
      'System logging strictly redacts personal information, recording only operational metadata such as topic categories and message lengths.',
    ],
  },
];

export const GUIDELINES_SECTIONS: LegalSection[] = [
  {
    title: '1. Factual Accuracy and Source Verification',
    paragraphs: [
      'Every substantive claim of fact in a campaign story must be substantiated by at least one verifiable external citation from a reputable publisher, academic body, government agency, or recognized news organization.',
      'Reviewers actively check all cited links during editorial inspection. Campaigns containing dead links, unverified personal assertions presented as facts, or doctored media will be returned for revision or rejected.',
    ],
  },
  {
    title: '2. Prohibited Content and Deceptive Practices',
    paragraphs: [
      'We strictly prohibit content that incites violence, promotes hate speech or harassment targeting protected groups, contains defamatory statements, or spreads harmful medical misinformation.',
      'Deceptive financial schemes, pyramid promotions, unauthorized commercial advertisements disguised as public interest causes, and political lobbying that violates digital advertising election transparency laws are strictly disallowed.',
    ],
  },
  {
    title: '3. Ad Creative Standards and Image Rights',
    paragraphs: [
      'All ad visual assets, headlines, and calls-to-action must be appropriate for general audiences and comply with standard digital advertising network specifications.',
      'Creators must possess the intellectual property rights or necessary commercial distribution licenses for all uploaded images, graphics, and video materials. Clickbait, deceptive button designs, and misleading headlines will not pass review.',
    ],
  },
  {
    title: '4. Community Flagging, Moderation, and Takedowns',
    paragraphs: [
      'Every published campaign includes a community moderation reporting mechanism. If new evidence emerges that a live campaign relies on falsified claims or violated our guidelines, compliance moderators investigate immediately.',
      'Campaigns found in violation will be paused, distribution halted, and any unspent advertising funds held for backer restitution.',
    ],
  },
];

export const CANONICAL_SLUGS: Record<string, string> = {
  'how-it-works': 'How Campaigns Works',
  about: 'About Campaigns',
  partners: 'Distribution Partners',
  faqs: 'Frequently Asked Questions',
  faq: 'Frequently Asked Questions', // Alias
  help: 'Help & Support',
  contact: 'Contact Support',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  'community-guidelines': 'Community Guidelines',
  guidelines: 'Community Guidelines', // Alias
};

export function normalizeInfoSlug(rawSlug: string): string {
  const clean = (rawSlug || '').toLowerCase().trim();
  if (clean === 'faq') return 'faqs';
  if (clean === 'guidelines') return 'community-guidelines';
  return clean;
}

export function validateContactInput(values: {
  name: string;
  email: string;
  message: string;
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!values.name.trim()) {
    errors.name = 'Please enter your name.';
  } else if (values.name.trim().length > 100) {
    errors.name = 'Name cannot exceed 100 characters.';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!values.email.trim()) {
    errors.email = 'Please enter your email address.';
  } else if (!emailRegex.test(values.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!values.message.trim()) {
    errors.message = 'Please enter a message.';
  } else if (values.message.trim().length < 10) {
    errors.message = 'Message must be at least 10 characters.';
  } else if (values.message.trim().length > 2000) {
    errors.message = 'Message cannot exceed 2000 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

