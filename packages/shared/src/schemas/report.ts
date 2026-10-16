import { z } from 'zod';

export const REACH_TYPES = ['ESTIMATED', 'MEASURED'] as const;
export type ReachType = (typeof REACH_TYPES)[number];
export const ReachTypeSchema = z.enum(REACH_TYPES);

export const ReportSchema = z.object({
  id: z.string().uuid(),
  campaignId: z.string().uuid(),
  fundsRaisedCents: z.number().int().min(0),
  platformFeeCents: z.number().int().min(0),
  adSpendCents: z.number().int().min(0),
  impressions: z.number().int().min(0),
  reach: z.number().int().min(0),
  reachType: ReachTypeSchema,
  clicks: z.number().int().min(0),
  ctr: z.number().min(0).max(1),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date(),
  isDemo: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});

export type Report = z.infer<typeof ReportSchema>;
