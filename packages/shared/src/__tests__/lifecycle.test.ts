import { describe, it, expect } from 'vitest';
import { canTransition, isPublicStatus, isBackableStatus, CAMPAIGN_STATUSES } from '../lifecycle';

describe('lifecycle state machine', () => {
  it('defines all 13 campaign statuses', () => {
    expect(CAMPAIGN_STATUSES.length).toBe(13);
  });

  it('allows valid progressive transitions', () => {
    expect(canTransition('DRAFT', 'SUBMITTED')).toBe(true);
    expect(canTransition('SUBMITTED', 'APPROVED')).toBe(true);
    expect(canTransition('SUBMITTED', 'CHANGES_REQUESTED')).toBe(true);
    expect(canTransition('SUBMITTED', 'REJECTED')).toBe(true);
    expect(canTransition('CHANGES_REQUESTED', 'SUBMITTED')).toBe(true);
    expect(canTransition('CHANGES_REQUESTED', 'CANCELLED')).toBe(true);
    expect(canTransition('APPROVED', 'FUNDING')).toBe(true);
    expect(canTransition('FUNDING', 'FUNDING_CLOSED')).toBe(true);
    expect(canTransition('FUNDING_CLOSED', 'DISTRIBUTION_PREP')).toBe(true);
    expect(canTransition('DISTRIBUTION_PREP', 'PROMOTING')).toBe(true);
    expect(canTransition('PROMOTING', 'COMPLETED')).toBe(true);
  });

  it('rejects invalid or illegal transitions', () => {
    // Cannot skip approval directly to funding from draft
    expect(canTransition('DRAFT', 'FUNDING')).toBe(false);
    // Cannot transition to self
    expect(canTransition('DRAFT', 'DRAFT')).toBe(false);
    expect(canTransition('FUNDING', 'FUNDING')).toBe(false);
    // Cannot promote directly from funding without preparation
    expect(canTransition('FUNDING', 'PROMOTING')).toBe(false);
    // Terminal states cannot transition
    expect(canTransition('COMPLETED', 'PROMOTING')).toBe(false);
    expect(canTransition('REJECTED', 'APPROVED')).toBe(false);
    expect(canTransition('CANCELLED', 'FUNDING')).toBe(false);
    expect(canTransition('FAILED', 'PROMOTING')).toBe(false);
  });

  it('correctly determines public visibility', () => {
    expect(isPublicStatus('FUNDING')).toBe(true);
    expect(isPublicStatus('PROMOTING')).toBe(true);
    expect(isPublicStatus('COMPLETED')).toBe(true);

    expect(isPublicStatus('DRAFT')).toBe(false);
    expect(isPublicStatus('SUBMITTED')).toBe(false);
    expect(isPublicStatus('CHANGES_REQUESTED')).toBe(false);
    expect(isPublicStatus('APPROVED')).toBe(false);
    expect(isPublicStatus('REJECTED')).toBe(false);
  });

  it('correctly determines backable status', () => {
    expect(isBackableStatus('FUNDING')).toBe(true);
    expect(isBackableStatus('FUNDING_CLOSED')).toBe(false);
    expect(isBackableStatus('PROMOTING')).toBe(false);
    expect(isBackableStatus('COMPLETED')).toBe(false);
    expect(isBackableStatus('DRAFT')).toBe(false);
  });
});
