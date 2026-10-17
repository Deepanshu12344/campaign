import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../client';
import { ApiError } from '../types';
import { Report } from '@campaigns/shared';

export function useReport(campaignId: string): UseQueryResult<Report, ApiError> {
  return useQuery<Report, ApiError>({
    queryKey: ['report', campaignId],
    queryFn: async () => {
      return apiClient.get<Report>(`/campaigns/${campaignId}/report`);
    },
    enabled: !!campaignId,
  });
}
