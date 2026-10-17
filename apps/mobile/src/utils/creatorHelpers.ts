import { CampaignCardDto, CampaignStatus } from '@campaigns/shared';

export type CreatorDashboardFilter =
  | 'Drafts'
  | 'Under Review'
  | 'Published/Funding'
  | 'Promoting'
  | 'Completed'
  | 'Requires Action';

export const CREATOR_FILTERS: readonly CreatorDashboardFilter[] = [
  'Drafts',
  'Under Review',
  'Published/Funding',
  'Promoting',
  'Completed',
  'Requires Action',
] as const;

/**
 * Filter campaigns into the 6 creator dashboard lifecycle buckets.
 */
export function filterCampaigns(
  campaigns: CampaignCardDto[],
  filter: CreatorDashboardFilter
): CampaignCardDto[] {
  switch (filter) {
    case 'Drafts':
      return campaigns.filter((c) => c.status === 'DRAFT');
    case 'Under Review':
      return campaigns.filter((c) => c.status === 'SUBMITTED');
    case 'Published/Funding':
      return campaigns.filter((c) =>
        ['APPROVED', 'FUNDING', 'FUNDING_CLOSED', 'DISTRIBUTION_PREP'].includes(c.status)
      );
    case 'Promoting':
      return campaigns.filter((c) => c.status === 'PROMOTING');
    case 'Completed':
      return campaigns.filter((c) => c.status === 'COMPLETED');
    case 'Requires Action':
      // Strictly changes requested or rejected
      return campaigns.filter(
        (c) => c.status === 'CHANGES_REQUESTED' || c.status === 'REJECTED'
      );
  }
}

/**
 * Computes counts for each dashboard filter tab.
 */
export function getDashboardFilterCounts(
  campaigns: CampaignCardDto[]
): Record<CreatorDashboardFilter, number> {
  const counts: Record<CreatorDashboardFilter, number> = {
    'Drafts': 0,
    'Under Review': 0,
    'Published/Funding': 0,
    'Promoting': 0,
    'Completed': 0,
    'Requires Action': 0,
  };

  for (const c of campaigns) {
    if (c.status === 'DRAFT') counts['Drafts']++;
    if (c.status === 'SUBMITTED') counts['Under Review']++;
    if (['APPROVED', 'FUNDING', 'FUNDING_CLOSED', 'DISTRIBUTION_PREP'].includes(c.status)) {
      counts['Published/Funding']++;
    }
    if (c.status === 'PROMOTING') counts['Promoting']++;
    if (c.status === 'COMPLETED') counts['Completed']++;
    if (c.status === 'CHANGES_REQUESTED' || c.status === 'REJECTED') {
      counts['Requires Action']++;
    }
  }

  return counts;
}

/**
 * Calculates aggregate summary metrics across a creator's portfolio.
 */
export function calculateCreatorSummary(campaigns: CampaignCardDto[]): {
  totalRaisedCents: number;
  activeCount: number;
} {
  let totalRaisedCents = 0;
  let activeCount = 0;

  for (const c of campaigns) {
    totalRaisedCents += c.raisedCents || 0;
    if (c.status === 'FUNDING' || c.status === 'PROMOTING') {
      activeCount++;
    }
  }

  return {
    totalRaisedCents,
    activeCount,
  };
}

export interface ContextualAction {
  label: string;
  route: string;
  variant: 'primary' | 'secondary' | 'ghost';
}

/**
 * Returns the primary contextual action for a campaign row in the dashboard.
 */
export function getContextualAction(campaign: CampaignCardDto): ContextualAction {
  switch (campaign.status) {
    case 'DRAFT':
      return {
        label: 'Edit draft',
        route: `/create/${campaign.id}/basics`,
        variant: 'primary',
      };
    case 'CHANGES_REQUESTED':
    case 'REJECTED':
      return {
        label: 'View feedback',
        route: `/creator/${campaign.id}`,
        variant: 'primary',
      };
    case 'FUNDING':
      return {
        label: 'Manage & Share',
        route: `/creator/${campaign.id}`,
        variant: 'secondary',
      };
    case 'PROMOTING':
      return {
        label: 'View distribution',
        route: `/creator/${campaign.id}`,
        variant: 'secondary',
      };
    case 'COMPLETED':
      return {
        label: 'View report',
        route: `/campaign/${campaign.id}/report`,
        variant: 'secondary',
      };
    case 'SUBMITTED':
      return {
        label: 'View review status',
        route: `/creator/${campaign.id}`,
        variant: 'ghost',
      };
    default:
      return {
        label: 'Manage',
        route: `/creator/${campaign.id}`,
        variant: 'secondary',
      };
  }
}

/**
 * Canonical sequence of sections for the Final Performance Report.
 */
export const REPORT_SECTIONS_SEQUENCE = [
  'Funds raised',
  'Platform fee',
  'Ad budget and spend',
  'Impressions',
  'Reach',
  'Clicks and CTR',
  'Duration',
  'Notes',
] as const;

/**
 * Lifecycle timeline stages for creator campaign management.
 */
export const LIFECYCLE_TIMELINE_STAGES: readonly CampaignStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'FUNDING',
  'DISTRIBUTION_PREP',
  'PROMOTING',
  'COMPLETED',
] as const;

export function getLifecycleStageIndex(status: CampaignStatus): number {
  if (status === 'CHANGES_REQUESTED' || status === 'REJECTED') {
    return 1; // At review step
  }
  const idx = LIFECYCLE_TIMELINE_STAGES.indexOf(status);
  return idx >= 0 ? idx : 0;
}
