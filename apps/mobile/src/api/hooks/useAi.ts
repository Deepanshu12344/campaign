import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '../client';
import { ApiError } from '../types';
import {
  AiDraftBasicsInput,
  AiDraftBasicsResponse,
  AiDraftStoryInput,
  AiDraftStoryResponse,
  AiAdCopyInput,
  AiAdCopyResponse,
} from '@campaigns/shared';

export function useAiDraftBasics(): UseMutationResult<
  AiDraftBasicsResponse,
  ApiError,
  AiDraftBasicsInput
> {
  return useMutation<AiDraftBasicsResponse, ApiError, AiDraftBasicsInput>({
    mutationFn: async (input: AiDraftBasicsInput) => {
      return apiClient.post<AiDraftBasicsResponse>('/ai/draft-basics', input, {
        timeoutMs: 10000,
      });
    },
  });
}

export function useAiDraftStory(): UseMutationResult<
  AiDraftStoryResponse,
  ApiError,
  AiDraftStoryInput
> {
  return useMutation<AiDraftStoryResponse, ApiError, AiDraftStoryInput>({
    mutationFn: async (input: AiDraftStoryInput) => {
      return apiClient.post<AiDraftStoryResponse>('/ai/draft-story', input, {
        timeoutMs: 10000,
      });
    },
  });
}

export function useAiAdCopy(): UseMutationResult<
  AiAdCopyResponse,
  ApiError,
  AiAdCopyInput
> {
  return useMutation<AiAdCopyResponse, ApiError, AiAdCopyInput>({
    mutationFn: async (input: AiAdCopyInput) => {
      return apiClient.post<AiAdCopyResponse>('/ai/ad-copy', input, {
        timeoutMs: 10000,
      });
    },
  });
}

