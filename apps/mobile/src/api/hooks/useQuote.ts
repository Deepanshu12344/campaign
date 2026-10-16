import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../client';
import { ApiError } from '../types';
import { QuoteResult } from '@campaigns/shared';

export function useQuote(
  campaignId: string | undefined,
  amountCents: number
): UseQueryResult<QuoteResult, ApiError> {
  return useQuery<QuoteResult, ApiError>({
    queryKey: ['campaigns', campaignId, 'quote', amountCents],
    queryFn: async () => {
      return apiClient.post<QuoteResult>(`/campaigns/${campaignId}/quote`, {
        amountCents,
      });
    },
    enabled: Boolean(campaignId) && amountCents >= 100,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
