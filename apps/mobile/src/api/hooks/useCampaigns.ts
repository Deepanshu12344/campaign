import {
  useInfiniteQuery,
  useQuery,
  UseInfiniteQueryResult,
  UseQueryResult,
  InfiniteData,
} from '@tanstack/react-query';
import { apiClient } from '../client';
import { ApiError } from '../types';
import {
  CampaignCardDto,
  CampaignDetailDto,
  CampaignListResponse,
  CampaignQuery,
} from '@campaigns/shared';

function buildQueryString(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

export function useCampaigns(
  filters: Partial<Omit<CampaignQuery, 'page'>> = {}
): UseInfiniteQueryResult<InfiniteData<CampaignListResponse>, ApiError> {
  return useInfiniteQuery<CampaignListResponse, ApiError>({
    queryKey: ['campaigns', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const queryParams = {
        ...filters,
        page: pageParam,
      };
      const qs = buildQueryString(queryParams);
      return apiClient.get<CampaignListResponse>(`/campaigns${qs}`);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasNextPage) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useFeatured(): UseQueryResult<CampaignCardDto[], ApiError> {
  return useQuery<CampaignCardDto[], ApiError>({
    queryKey: ['campaigns', 'featured'],
    queryFn: async () => {
      return apiClient.get<CampaignCardDto[]>('/campaigns/featured');
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCampaign(id: string): UseQueryResult<CampaignDetailDto, ApiError> {
  return useQuery<CampaignDetailDto, ApiError>({
    queryKey: ['campaigns', id],
    queryFn: async () => {
      return apiClient.get<CampaignDetailDto>(`/campaigns/${id}`);
    },
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  });
}
