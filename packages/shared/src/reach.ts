import { ESTIMATE_CONFIG } from './config/estimates';

export interface QuoteResult {
  amountCents: number;
  adBudgetCents: number;
  platformFeeCents: number;
  processingFeeCents: number;
  totalCents: number;
  estimatedReachLow: number;
  estimatedReachMid: number;
  estimatedReachHigh: number;
}

export interface ReachAtGoalResult {
  goalCents: number;
  adBudgetCents: number;
  platformFeeCents: number;
  estimatedReachLow: number;
  estimatedReachMid: number;
  estimatedReachHigh: number;
}

/**
 * Calculates financial breakdown and estimated audience reach for a given contribution amount in cents.
 */
export function quote(amountCents: number): QuoteResult {
  if (amountCents <= 0) {
    return {
      amountCents: 0,
      adBudgetCents: 0,
      platformFeeCents: 0,
      processingFeeCents: 0,
      totalCents: 0,
      estimatedReachLow: 0,
      estimatedReachMid: 0,
      estimatedReachHigh: 0,
    };
  }

  const platformFeeCents = Math.round(amountCents * ESTIMATE_CONFIG.platformFeePct);
  const adBudgetCents = amountCents - platformFeeCents;
  const processingFeeCents =
    Math.round(amountCents * ESTIMATE_CONFIG.processingPct) + ESTIMATE_CONFIG.processingFixedCents;
  const totalCents = amountCents + processingFeeCents;

  const adBudgetDollars = adBudgetCents / 100;
  const impressions = (adBudgetDollars / ESTIMATE_CONFIG.cpm) * 1000;
  const estimatedReachMid = Math.round(impressions / ESTIMATE_CONFIG.avgFrequency);
  const estimatedReachLow = Math.round(estimatedReachMid * (1 - ESTIMATE_CONFIG.rangePct));
  const estimatedReachHigh = Math.round(estimatedReachMid * (1 + ESTIMATE_CONFIG.rangePct));

  return {
    amountCents,
    adBudgetCents,
    platformFeeCents,
    processingFeeCents,
    totalCents,
    estimatedReachLow,
    estimatedReachMid,
    estimatedReachHigh,
  };
}

/**
 * Calculates estimated audience reach and ad budget allocation for a campaign funding goal.
 */
export function reachAtGoal(goalCents: number): ReachAtGoalResult {
  if (goalCents <= 0) {
    return {
      goalCents: 0,
      adBudgetCents: 0,
      platformFeeCents: 0,
      estimatedReachLow: 0,
      estimatedReachMid: 0,
      estimatedReachHigh: 0,
    };
  }

  const platformFeeCents = Math.round(goalCents * ESTIMATE_CONFIG.platformFeePct);
  const adBudgetCents = goalCents - platformFeeCents;

  const adBudgetDollars = adBudgetCents / 100;
  const impressions = (adBudgetDollars / ESTIMATE_CONFIG.cpm) * 1000;
  const estimatedReachMid = Math.round(impressions / ESTIMATE_CONFIG.avgFrequency);
  const estimatedReachLow = Math.round(estimatedReachMid * (1 - ESTIMATE_CONFIG.rangePct));
  const estimatedReachHigh = Math.round(estimatedReachMid * (1 + ESTIMATE_CONFIG.rangePct));

  return {
    goalCents,
    adBudgetCents,
    platformFeeCents,
    estimatedReachLow,
    estimatedReachMid,
    estimatedReachHigh,
  };
}
