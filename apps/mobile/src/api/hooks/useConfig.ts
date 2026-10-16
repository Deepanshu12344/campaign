import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../client';
import { ApiError } from '../types';
import { EstimateConfig } from '@campaigns/shared';

export function useEstimateConfig(): UseQueryResult<EstimateConfig, ApiError> {
  return useQuery<EstimateConfig, ApiError>({
    queryKey: ['config', 'estimates'],
    queryFn: async () => {
      return apiClient.get<EstimateConfig>('/config/estimates', {
        skipAuth: true,
      });
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
