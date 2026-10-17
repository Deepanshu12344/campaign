import { z } from 'zod';

export const CONTRIBUTION_STATUSES = [
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'REJECTED',
  'REFUNDED',
] as const;

export type ContributionStatus = (typeof CONTRIBUTION_STATUSES)[number];
export const ContributionStatusSchema = z.enum(CONTRIBUTION_STATUSES);

export const ContributionSchema = z.object({
  id: z.string().uuid(),
  campaignId: z.string().uuid(),
  userId: z.string().optional().nullable(),
  guestEmail: z.string().email().optional().nullable(),
  guestReceiptToken: z.string().optional().nullable(),
  amountCents: z.number().int().min(100), // Min $1.00
  feeCents: z.number().int(),
  totalCents: z.number().int(),
  status: ContributionStatusSchema,
  publicName: z.string().optional().nullable(),
  isAnonymous: z.boolean().default(true),
  receiptNo: z.string(),
  isDemo: z.boolean().default(true),
  createdAt: z.coerce.date(),
});

export type Contribution = z.infer<typeof ContributionSchema>;

export const CreateContributionInputSchema = z.object({
  campaignId: z.string().uuid(),
  amountCents: z.number().int().min(100, 'Minimum contribution is $1.00'),
  guestEmail: z.string().email('Valid email is required for receipt delivery').optional(),
  publicName: z.string().max(50).optional(),
  isAnonymous: z.boolean().default(true),
});

export type CreateContributionInput = z.infer<typeof CreateContributionInputSchema>;

export const PayContributionInputSchema = z.object({
  cardNumber: z.string().min(12).max(19),
  expMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, 'MM'),
  expYear: z.string().regex(/^\d{2,4}$/, 'YY or YYYY'),
  cvc: z.string().min(3).max(4),
  cardholderName: z.string().optional(),
});

export type PayContributionInput = z.infer<typeof PayContributionInputSchema>;

export const ContributionReceiptDtoSchema = z.object({
  id: z.string().uuid(),
  receiptNo: z.string(),
  campaignId: z.string().uuid(),
  campaignTitle: z.string(),
  amountCents: z.number().int(),
  feeCents: z.number().int(),
  totalCents: z.number().int(),
  status: ContributionStatusSchema,
  isAnonymous: z.boolean(),
  publicName: z.string().nullable().optional(),
  cardBrand: z.string().nullable().optional(),
  cardLast4: z.string().nullable().optional(),
  guestEmail: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  isDemo: z.boolean().default(true),
});

export type ContributionReceiptDto = z.infer<typeof ContributionReceiptDtoSchema>;

export const ClaimContributionsInputSchema = z.object({
  tokens: z.array(z.string().min(1)).min(1, 'At least one receipt token is required'),
});

export type ClaimContributionsInput = z.infer<typeof ClaimContributionsInputSchema>;

