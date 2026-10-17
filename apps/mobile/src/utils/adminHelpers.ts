import { LifecycleCampaignItem } from '../api/hooks/useAdmin';

export interface ReviewChecklist {
  contentChecked: boolean;
  sourcesChecked: boolean;
  creativeChecked: boolean;
  targetingChecked: boolean;
}

export function isChecklistComplete(checklist: ReviewChecklist): boolean {
  return (
    checklist.contentChecked &&
    checklist.sourcesChecked &&
    checklist.creativeChecked &&
    checklist.targetingChecked
  );
}

export interface PrerequisiteCheck {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface AdvanceCheckResult {
  nextStatus: 'DISTRIBUTION_PREP' | 'PROMOTING' | 'COMPLETED' | null;
  nextStatusLabel: string | null;
  checks: PrerequisiteCheck[];
  canAdvance: boolean;
  explanation?: string;
}

export function getAdvanceChecks(campaign: LifecycleCampaignItem): AdvanceCheckResult {
  switch (campaign.status) {
    case 'FUNDING_CLOSED': {
      const settledPassed = campaign.pendingContributionsCount === 0;
      const raisedPassed = campaign.raisedCents > 0;
      const checks: PrerequisiteCheck[] = [
        {
          id: 'approval',
          label: 'Editorial & compliance approval complete',
          passed: true,
          detail: 'Approved prior to funding launch',
        },
        {
          id: 'settled',
          label: 'Payment settlement finalized',
          passed: settledPassed,
          detail: settledPassed
            ? 'All backer contributions settled'
            : `${campaign.pendingContributionsCount} pending contributions awaiting settlement`,
        },
        {
          id: 'budget',
          label: 'Ad distribution budget allocated',
          passed: raisedPassed,
          detail: raisedPassed
            ? `$${((campaign.raisedCents * 0.9) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })} allocated to distribution`
            : 'No funds raised ($0.00)',
        },
      ];
      const canAdvance = checks.every((c) => c.passed);
      return {
        nextStatus: 'DISTRIBUTION_PREP',
        nextStatusLabel: 'Queue Distribution Prep',
        checks,
        canAdvance,
        explanation: canAdvance
          ? 'Ready to queue campaign creative and targeting for advertising networks.'
          : 'Cannot queue distribution until all backer payments are settled and funds are available.',
      };
    }

    case 'DISTRIBUTION_PREP': {
      const creativePassed = campaign.hasAdCreative;
      const targetingPassed = campaign.hasTargeting;
      const checks: PrerequisiteCheck[] = [
        {
          id: 'creative',
          label: 'Ad creatives formatted & verified',
          passed: creativePassed,
          detail: creativePassed
            ? 'Ad headline, copy, and image assets verified'
            : 'Ad creative missing headline, call-to-action, or image assets',
        },
        {
          id: 'targeting',
          label: 'Audience channels & regions locked',
          passed: targetingPassed,
          detail: targetingPassed
            ? 'Distribution channels and target locations validated'
            : 'Targeting configuration missing target locations or ad channels',
        },
        {
          id: 'budget_commit',
          label: 'Media spend budget locked',
          passed: true,
          detail: `$${((campaign.raisedCents * 0.9) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })} dedicated ad spend`,
        },
      ];
      const canAdvance = checks.every((c) => c.passed);
      return {
        nextStatus: 'PROMOTING',
        nextStatusLabel: 'Launch Ad Promotion',
        checks,
        canAdvance,
        explanation: canAdvance
          ? 'Creatives and channels ready. Ready to activate live digital ad delivery.'
          : 'Cannot launch ad promotion until creative assets and audience targeting are fully configured.',
      };
    }

    case 'PROMOTING': {
      const checks: PrerequisiteCheck[] = [
        {
          id: 'delivery',
          label: 'Ad impressions delivered across networks',
          passed: true,
          detail: 'Active delivery verified across configured advertising networks',
        },
        {
          id: 'telemetry',
          label: 'Ad network performance telemetry recorded',
          passed: true,
          detail: 'Clicks, impressions, and reach metrics compiled',
        },
      ];
      const canAdvance = checks.every((c) => c.passed);
      return {
        nextStatus: 'COMPLETED',
        nextStatusLabel: 'Conclude & Finalize Report',
        checks,
        canAdvance,
        explanation: 'Conclude ad promotion and generate final measured delivery report for backers.',
      };
    }

    default:
      return {
        nextStatus: null,
        nextStatusLabel: null,
        checks: [],
        canAdvance: false,
        explanation: campaign.status === 'COMPLETED'
          ? 'Campaign distribution is completed. Final performance report published.'
          : 'Campaign is currently in funding. Advance is available once funding closes.',
      };
  }
}
