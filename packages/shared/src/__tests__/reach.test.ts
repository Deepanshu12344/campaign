import { describe, it, expect } from 'vitest';
import { quote, reachAtGoal } from '../reach';
import { ESTIMATE_CONFIG } from '../config/estimates';

describe('reach quote math', () => {
  it('has valid default estimate configurations', () => {
    expect(ESTIMATE_CONFIG.platformFeePct).toBe(0.1);
    expect(ESTIMATE_CONFIG.cpm).toBe(6);
    expect(ESTIMATE_CONFIG.avgFrequency).toBe(2.2);
    expect(ESTIMATE_CONFIG.presetAmounts).toEqual([5, 10, 25, 50, 100]);
  });

  it('returns zeros for non-positive amounts', () => {
    const resZero = quote(0);
    expect(resZero.adBudgetCents).toBe(0);
    expect(resZero.totalCents).toBe(0);
    expect(resZero.estimatedReachMid).toBe(0);

    const resNeg = quote(-500);
    expect(resNeg.adBudgetCents).toBe(0);
    expect(resNeg.totalCents).toBe(0);
  });

  it('accurately calculates breakdown and reach for $5.00 (500 cents)', () => {
    const result = quote(500);
    // Platform fee 10%: 50 cents
    expect(result.platformFeeCents).toBe(50);
    // Ad budget: 450 cents
    expect(result.adBudgetCents).toBe(450);
    // Processing fee: round(500 * 0.029) + 30 = 15 + 30 = 45 cents
    expect(result.processingFeeCents).toBe(45);
    // Total charged to backer: 545 cents ($5.45)
    expect(result.totalCents).toBe(545);

    // Impressions: (4.50 / 6) * 1000 = 750
    // Mid reach: 750 / 2.2 = 341
    expect(result.estimatedReachMid).toBe(341);
    expect(result.estimatedReachLow).toBe(Math.round(341 * 0.7));
    expect(result.estimatedReachHigh).toBe(Math.round(341 * 1.3));
    expect(result.estimatedReachLow).toBeLessThan(result.estimatedReachMid);
    expect(result.estimatedReachHigh).toBeGreaterThan(result.estimatedReachMid);
  });

  it('calculates breakdown for minimum $1.00 (100 cents)', () => {
    const result = quote(100);
    expect(result.platformFeeCents).toBe(10);
    expect(result.adBudgetCents).toBe(90);
    // Processing fee: round(100 * 0.029) + 30 = 3 + 30 = 33 cents
    expect(result.processingFeeCents).toBe(33);
    expect(result.totalCents).toBe(133);
    expect(result.estimatedReachMid).toBeGreaterThan(0);
  });

  it('matches ~68 people per dollar mid expectation on a $100 contribution', () => {
    const result = quote(10000); // $100
    // 90 dollars ad budget -> (90 / 6) * 1000 = 15000 impressions -> 15000 / 2.2 = ~6818 people
    // ~68.18 people per dollar
    expect(Math.round(result.estimatedReachMid / 100)).toBe(68);
  });
});

describe('reachAtGoal calculation', () => {
  it('returns zeros for non-positive goals', () => {
    const res = reachAtGoal(0);
    expect(res.adBudgetCents).toBe(0);
    expect(res.estimatedReachMid).toBe(0);
  });

  it('calculates reach for a $5,000 goal', () => {
    const goalCents = 500000;
    const res = reachAtGoal(goalCents);
    expect(res.platformFeeCents).toBe(50000);
    expect(res.adBudgetCents).toBe(450000);
    // (4500 / 6) * 1000 = 750,000 impressions / 2.2 = 340,909
    expect(res.estimatedReachMid).toBe(340909);
    expect(res.estimatedReachLow).toBe(Math.round(340909 * 0.7));
    expect(res.estimatedReachHigh).toBe(Math.round(340909 * 1.3));
  });
});
