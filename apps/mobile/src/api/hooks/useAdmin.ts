import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '../client';
import { ApiError } from '../types';
import {
  AdminDecisionInput,
  AdminAdvanceInput,
  SimulateReportInput,
  Report,
  CampaignDetailDto,
} from '@campaigns/shared';

export interface AdminQueueItem {
  id: string;
  title: string;
  category: string;
  creatorName: string;
  creatorType?: string;
  creatorId: string;
  status: string;
  summary?: string;
  coverUrl?: string | null;
  reviewType: 'NEW_SUBMISSION' | 'PENDING_REVISION';
  fundingGoalCents: number;
  submittedAt: string | Date;
  pendingRevision: Record<string, unknown> | null;
  story: unknown[];
  sources: unknown[];
  adCreative: unknown;
  reach: unknown;
}

export interface LifecycleCampaignItem {
  id: string;
  title: string;
  category: string;
  creatorName: string;
  creatorType: string;
  summary: string;
  coverUrl: string | null;
  status: 'FUNDING' | 'FUNDING_CLOSED' | 'DISTRIBUTION_PREP' | 'PROMOTING' | 'COMPLETED' | string;
  fundingGoalCents: number;
  raisedCents: number;
  percentFunded: number;
  daysRemaining: number | null;
  estimatedReachLow: number;
  estimatedReachHigh: number;
  isDemo: boolean;
  pendingContributionsCount: number;
  hasAdCreative: boolean;
  hasTargeting: boolean;
}

export interface AdminAuditTrail {
  decisions: Array<{
    id: string;
    decision: string;
    notes: string;
    reviewerName: string;
    createdAt: string | Date;
  }>;
  events: Array<{
    id: string;
    type: string;
    payload: unknown;
    createdAt: string | Date;
  }>;
}

export function useAdminQueue(): UseQueryResult<AdminQueueItem[], ApiError> {
  return useQuery<AdminQueueItem[], ApiError>({
    queryKey: ['admin-queue'],
    queryFn: async () => {
      return apiClient.get<AdminQueueItem[]>('/admin/queue');
    },
  });
}

export function useLifecycleCampaigns(): UseQueryResult<LifecycleCampaignItem[], ApiError> {
  return useQuery<LifecycleCampaignItem[], ApiError>({
    queryKey: ['admin-lifecycle'],
    queryFn: async () => {
      return apiClient.get<LifecycleCampaignItem[]>('/admin/lifecycle');
    },
  });
}

export function useAdminAudit(campaignId: string): UseQueryResult<AdminAuditTrail, ApiError> {
  return useQuery<AdminAuditTrail, ApiError>({
    queryKey: ['admin-audit', campaignId],
    queryFn: async () => {
      return apiClient.get<AdminAuditTrail>(`/admin/campaigns/${campaignId}/audit`);
    },
    enabled: Boolean(campaignId),
  });
}

export function useAdminDecision(): UseMutationResult<
  { success: boolean; message: string },
  ApiError,
  { id: string; input: AdminDecisionInput }
> {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; message: string }, ApiError, { id: string; input: AdminDecisionInput }>({
    mutationFn: async ({ id, input }) => {
      return apiClient.post<{ success: boolean; message: string }>(`/admin/campaigns/${id}/decision`, input);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-queue'] });
      queryClient.invalidateQueries({ queryKey: ['admin-lifecycle'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit', id] });
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useAdminAdvance(): UseMutationResult<
  CampaignDetailDto,
  ApiError,
  { id: string; input?: AdminAdvanceInput }
> {
  const queryClient = useQueryClient();

  return useMutation<CampaignDetailDto, ApiError, { id: string; input?: AdminAdvanceInput }>({
    mutationFn: async ({ id, input = {} }) => {
      return apiClient.post<CampaignDetailDto>(`/admin/campaigns/${id}/advance`, input);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['campaign', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['admin-queue'] });
      queryClient.invalidateQueries({ queryKey: ['admin-lifecycle'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit', data.id] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['report', data.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useSimulateFundGoal(): UseMutationResult<
  CampaignDetailDto,
  ApiError,
  { id: string }
> {
  const queryClient = useQueryClient();

  return useMutation<CampaignDetailDto, ApiError, { id: string }>({
    mutationFn: async ({ id }) => {
      return apiClient.post<CampaignDetailDto>(`/admin/campaigns/${id}/simulate-fund-goal`, {});
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['campaign', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['admin-lifecycle'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit', data.id] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useSimulateReport(): UseMutationResult<
  Report,
  ApiError,
  { id: string; input?: SimulateReportInput }
> {
  const queryClient = useQueryClient();

  return useMutation<Report, ApiError, { id: string; input?: SimulateReportInput }>({
    mutationFn: async ({ id, input = {} }) => {
      return apiClient.post<Report>(`/admin/campaigns/${id}/simulate-report`, input);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['report', data.campaignId], data);
      queryClient.invalidateQueries({ queryKey: ['campaign', data.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['admin-lifecycle'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit', data.campaignId] });
    },
  });
}

export function useResetDemo(): UseMutationResult<{ success: boolean; message: string }, ApiError, void> {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; message: string }, ApiError, void>({
    mutationFn: async () => {
      return apiClient.post<{ success: boolean; message: string }>('/admin/reset-demo', {});
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
