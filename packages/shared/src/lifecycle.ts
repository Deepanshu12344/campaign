import { z } from 'zod';

export const CAMPAIGN_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'CHANGES_REQUESTED',
  'APPROVED',
  'FUNDING',
  'FUNDING_CLOSED',
  'DISTRIBUTION_PREP',
  'PROMOTING',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
  'REFUND_PENDING',
  'FAILED',
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CampaignStatusSchema = z.enum(CAMPAIGN_STATUSES);

/**
 * Valid transitions lookup table based on .agent/rules/00-project.md
 */
const ALLOWED_TRANSITIONS: Record<CampaignStatus, readonly CampaignStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'],
  CHANGES_REQUESTED: ['SUBMITTED', 'CANCELLED'],
  APPROVED: ['FUNDING', 'CANCELLED'],
  FUNDING: ['FUNDING_CLOSED', 'CANCELLED', 'REFUND_PENDING'],
  FUNDING_CLOSED: ['DISTRIBUTION_PREP', 'REFUND_PENDING', 'CANCELLED'],
  DISTRIBUTION_PREP: ['PROMOTING', 'CANCELLED'],
  PROMOTING: ['COMPLETED', 'FAILED'],
  REFUND_PENDING: ['CANCELLED', 'FAILED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
  FAILED: [],
};

/**
 * Returns true if a transition from `from` to `to` is permitted by the lifecycle state machine.
 */
export function canTransition(from: CampaignStatus, to: CampaignStatus): boolean {
  if (from === to) {
    return false;
  }
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed.includes(to);
}

/**
 * Only campaigns in these states are visible on public feeds and discovery for guests.
 */
export function isPublicStatus(status: CampaignStatus): boolean {
  return status === 'FUNDING' || status === 'PROMOTING' || status === 'COMPLETED';
}

/**
 * Only campaigns in FUNDING state accept contributions.
 */
export function isBackableStatus(status: CampaignStatus): boolean {
  return status === 'FUNDING';
}
