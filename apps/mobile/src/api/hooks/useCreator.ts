import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '../client';
import { ApiError } from '../types';
import { useAuthStore } from '../../store/authStore';
import {
  CampaignCardDto,
  CampaignDetailDto,
  CampaignAnalyticsDto,
  DraftUpdateInput,
  SubmitCampaignInput,
  CampaignUpdateInput,
} from '@campaigns/shared';

export function useMyCampaigns(status?: string): UseQueryResult<CampaignCardDto[], ApiError> {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<CampaignCardDto[], ApiError>({
    queryKey: ['my-campaigns', status],
    queryFn: async () => {
      const qs = status ? `?status=${encodeURIComponent(status)}` : '';
      return apiClient.get<CampaignCardDto[]>(`/me/campaigns${qs}`);
    },
    enabled: isAuthenticated,
  });
}

export function useCreateDraft(): UseMutationResult<CampaignDetailDto, ApiError, void> {
  const queryClient = useQueryClient();

  return useMutation<CampaignDetailDto, ApiError, void>({
    mutationFn: async () => {
      return apiClient.post<CampaignDetailDto>('/campaigns', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-campaigns'] });
    },
  });
}

export function useAutosaveDraft(): UseMutationResult<
  CampaignDetailDto,
  ApiError,
  { id: string; data: DraftUpdateInput }
> {
  const queryClient = useQueryClient();

  return useMutation<CampaignDetailDto, ApiError, { id: string; data: DraftUpdateInput }>({
    mutationFn: async ({ id, data }) => {
      return apiClient.patch<CampaignDetailDto>(`/campaigns/${id}/draft`, data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['campaign', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['my-campaigns'] });
    },
  });
}

export function useSubmitCampaign(): UseMutationResult<
  CampaignDetailDto,
  ApiError,
  { id: string; input: SubmitCampaignInput }
> {
  const queryClient = useQueryClient();

  return useMutation<CampaignDetailDto, ApiError, { id: string; input: SubmitCampaignInput }>({
    mutationFn: async ({ id, input }) => {
      return apiClient.post<CampaignDetailDto>(`/campaigns/${id}/submit`, input);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['campaign', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['my-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useUploadImage(): UseMutationResult<
  { url: string; filename: string; size: number; mimeType: string },
  ApiError,
  FormData
> {
  return useMutation<
    { url: string; filename: string; size: number; mimeType: string },
    ApiError,
    FormData
  >({
    mutationFn: async (formData) => {
      return apiClient.uploadFile<{ url: string; filename: string; size: number; mimeType: string }>(
        '/uploads',
        formData
      );
    },
  });
}

export function useCampaignAnalytics(campaignId: string): UseQueryResult<CampaignAnalyticsDto, ApiError> {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<CampaignAnalyticsDto, ApiError>({
    queryKey: ['campaign-analytics', campaignId],
    queryFn: async () => {
      return apiClient.get<CampaignAnalyticsDto>(`/me/campaigns/${campaignId}/analytics`);
    },
    enabled: !!campaignId && isAuthenticated,
  });
}

export function usePostUpdate(): UseMutationResult<
  { id: string; title: string; body: string; createdAt: Date },
  ApiError,
  { campaignId: string; data: CampaignUpdateInput }
> {
  const queryClient = useQueryClient();

  return useMutation<
    { id: string; title: string; body: string; createdAt: Date },
    ApiError,
    { campaignId: string; data: CampaignUpdateInput }
  >({
    mutationFn: async ({ campaignId, data }) => {
      return apiClient.post<{ id: string; title: string; body: string; createdAt: Date }>(
        `/campaigns/${campaignId}/updates`,
        data
      );
    },
    onSuccess: (_, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteDraft(): UseMutationResult<{ success: boolean }, ApiError, string> {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, ApiError, string>({
    mutationFn: async (campaignId) => {
      return apiClient.delete<{ success: boolean }>(`/campaigns/${campaignId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-campaigns'] });
    },
  });
}
