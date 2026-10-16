import {
  useMutation,
  useQueryClient,
  UseMutationResult,
} from '@tanstack/react-query';
import { apiClient } from '../client';
import { ApiError } from '../types';
import { FeedbackInput, CampaignDetailDto } from '@campaigns/shared';

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
    },
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
    },
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
