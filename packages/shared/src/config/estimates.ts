export const ESTIMATE_CONFIG = {
  platformFeePct: 0.1,
  processingPct: 0.029,
  processingFixedCents: 30,
  cpm: 6,
  avgFrequency: 2.2,
  rangePct: 0.3,
  presetAmounts: [5, 10, 25, 50, 100],
  minContribution: 1,
  minUnderfundedThresholdPct: 0.25,
} as const;

export type EstimateConfig = typeof ESTIMATE_CONFIG;
