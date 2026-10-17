import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';
import { apiClient } from '../client';
import { ApiError } from '../types';
import { FeedbackInput, CampaignDetailDto, CampaignCardDto } from '@campaigns/shared';

export function useSaveCampaign(
  campaignId: string
): UseMutationResult<{ saved: boolean }, ApiError, boolean> {
  const queryClient = useQueryClient();

  return useMutation<{ saved: boolean }, ApiError, boolean>({
    mutationFn: async (save: boolean) => {
      if (save) {
        return apiClient.post<{ saved: boolean }>(`/campaigns/${campaignId}/save`);
      } else {
        return apiClient.delete<{ saved: boolean }>(`/campaigns/${campaignId}/save`);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['campaigns', campaignId], (old: CampaignDetailDto | undefined) => {
        if (!old) return old;
        return { ...old, isSaved: data.saved };
      });
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'saved'] });
    },
  });
}

export function useSavedCampaigns(): UseQueryResult<CampaignCardDto[], ApiError> {
  return useQuery<CampaignCardDto[], ApiError>({
    queryKey: ['campaigns', 'saved'],
    queryFn: async () => {
      return apiClient.get<CampaignCardDto[]>('/campaigns/saved');
    },
    staleTime: 30 * 1000,
  });
}

export function useFollowCampaign(
  campaignId: string
): UseMutationResult<{ following: boolean }, ApiError, boolean> {
  const queryClient = useQueryClient();

  return useMutation<{ following: boolean }, ApiError, boolean>({
    mutationFn: async (follow: boolean) => {
      if (follow) {
        return apiClient.post<{ following: boolean }>(`/campaigns/${campaignId}/follow`);
      } else {
        return apiClient.delete<{ following: boolean }>(`/campaigns/${campaignId}/follow`);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['campaigns', campaignId], (old: CampaignDetailDto | undefined) => {
        if (!old) return old;
        return { ...old, isFollowing: data.following };
      });
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'following'] });
    },
  });
}

export function useFollowedCampaigns(): UseQueryResult<CampaignCardDto[], ApiError> {
  return useQuery<CampaignCardDto[], ApiError>({
    queryKey: ['campaigns', 'following'],
    queryFn: async () => {
      return apiClient.get<CampaignCardDto[]>('/campaigns/following');
    },
    staleTime: 30 * 1000,
  });
}

export function useSubmitFeedback(
  campaignId: string
): UseMutationResult<{ success: boolean; message: string }, ApiError, FeedbackInput> {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; message: string }, ApiError, FeedbackInput>({
    mutationFn: async (input: FeedbackInput) => {
      return apiClient.post<{ success: boolean; message: string }>(
        `/campaigns/${campaignId}/feedback`,
        input
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId] });
    },
  });
}
