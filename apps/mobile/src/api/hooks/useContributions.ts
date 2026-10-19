import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '../client';
import { ApiError } from '../types';
import { recordGuestReceiptToken, getGuestTokenForContribution } from '../tokens';
import { useAuthStore } from '../../store/authStore';
import {
  Contribution,
  ContributionReceiptDto,
  CreateContributionInput,
  PayContributionInput,
  CampaignStatus,
} from '@campaigns/shared';

export interface PayContributionResult {
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING';
  receipt?: ContributionReceiptDto;
  contribution: Contribution;
  failureReason?: string;
  message?: string;
}

export function useCreateContribution(): UseMutationResult<
  { contribution: Contribution; guestReceiptToken: string | null },
  ApiError,
  CreateContributionInput
> {
  const queryClient = useQueryClient();

  return useMutation<
    { contribution: Contribution; guestReceiptToken: string | null },
    ApiError,
    CreateContributionInput
  >({
    mutationFn: async (input) => {
      const response = await apiClient.post<{
        contribution: Contribution;
        guestReceiptToken: string | null;
      }>('/contributions', input);

      if (response.guestReceiptToken) {
        await recordGuestReceiptToken(response.contribution.id, response.guestReceiptToken);
      }

      return response;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['contribution', data.contribution.id], data.contribution);
      queryClient.invalidateQueries({ queryKey: ['my-contributions'] });
    },
  });
}

export interface PayContributionVariables {
  id: string;
  data: PayContributionInput;
  guestReceiptToken?: string | null;
}

export function usePay(): UseMutationResult<
  PayContributionResult,
  ApiError,
  PayContributionVariables
> {
  const queryClient = useQueryClient();

  return useMutation<PayContributionResult, ApiError, PayContributionVariables>({
    mutationFn: async ({ id, data, guestReceiptToken }) => {
      const token = guestReceiptToken || (await getGuestTokenForContribution(id));
      const headers: Record<string, string> = {};
      if (token) {
        headers['x-guest-receipt-token'] = token;
      }
      return apiClient.post<PayContributionResult>(`/contributions/${id}/pay`, data, { headers });
    },
    onSuccess: (result, { id }) => {
      queryClient.setQueryData(['contribution', id], result.contribution);
      if (result.receipt) {
        queryClient.setQueryData(['receipt', id], result.receipt);
      }
      queryClient.invalidateQueries({ queryKey: ['my-contributions'] });
      queryClient.invalidateQueries({ queryKey: ['campaign', result.contribution.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useCancelContribution(): UseMutationResult<
  Contribution,
  ApiError,
  string | { id: string; guestReceiptToken?: string | null }
> {
  const queryClient = useQueryClient();

  return useMutation<
    Contribution,
    ApiError,
    string | { id: string; guestReceiptToken?: string | null }
  >({
    mutationFn: async (arg) => {
      const id = typeof arg === 'string' ? arg : arg.id;
      const explicitToken = typeof arg === 'string' ? undefined : arg.guestReceiptToken;
      const token = explicitToken || (await getGuestTokenForContribution(id));
      const headers: Record<string, string> = {};
      if (token) {
        headers['x-guest-receipt-token'] = token;
      }
      return apiClient.post<Contribution>(`/contributions/${id}/cancel`, undefined, { headers });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['contribution', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['my-contributions'] });
    },
  });
}

export function useContribution(
  id: string | undefined,
  options?: {
    guestReceiptToken?: string | null;
    refetchInterval?: number | false | ((query: unknown) => number | false);
  }
): UseQueryResult<Contribution, ApiError> {
  return useQuery<Contribution, ApiError>({
    queryKey: ['contribution', id, options?.guestReceiptToken],
    queryFn: async () => {
      if (!id) throw new Error('Missing contribution ID');
      const token = options?.guestReceiptToken || (await getGuestTokenForContribution(id));
      const headers: Record<string, string> = {};
      if (token) {
        headers['x-guest-receipt-token'] = token;
      }
      return apiClient.get<Contribution>(`/contributions/${id}`, { headers });
    },
    enabled: !!id,
    refetchInterval: options?.refetchInterval,
  });
}

export type MyContributionItem = Contribution & {
  campaignTitle: string;
  campaignCoverUrl: string | null;
  campaignStatus?: CampaignStatus;
  campaignGoalCents?: number;
  campaignRaisedCents?: number;
};

export function useMyContributions(): UseQueryResult<MyContributionItem[], ApiError> {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<MyContributionItem[], ApiError>({
    queryKey: ['my-contributions'],
    queryFn: async () => {
      return apiClient.get<MyContributionItem[]>('/me/contributions');
    },
    enabled: isAuthenticated,
  });
}

export function useReceipt(
  id: string | undefined,
  guestReceiptToken?: string | null
): UseQueryResult<ContributionReceiptDto, ApiError> {
  return useQuery<ContributionReceiptDto, ApiError>({
    queryKey: ['receipt', id, guestReceiptToken],
    queryFn: async () => {
      if (!id) throw new Error('Missing receipt ID');
      const token = guestReceiptToken || (await getGuestTokenForContribution(id));
      const headers: Record<string, string> = {};
      if (token) {
        headers['x-guest-receipt-token'] = token;
      }
      return apiClient.get<ContributionReceiptDto>(`/contributions/${id}/receipt`, { headers });
    },
    enabled: !!id,
  });
}

export function useClaimContributions(): UseMutationResult<
  { claimedCount: number },
  ApiError,
  { tokens: string[] }
> {
  const queryClient = useQueryClient();

  return useMutation<{ claimedCount: number }, ApiError, { tokens: string[] }>({
    mutationFn: async (input) => {
      return apiClient.post<{ claimedCount: number }>('/contributions/claim', input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-contributions'] });
    },
  });
}
