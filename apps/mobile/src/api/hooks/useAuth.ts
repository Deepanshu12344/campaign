import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';
import { apiClient } from '../client';
import { setTokens, clearTokens } from '../tokens';
import { ApiError } from '../types';
import { useAuthStore } from '../../store/authStore';
import {
  AuthResponse,
  SignInInput,
  SignUpInput,
  UserProfile,
} from '@campaigns/shared';

export function useSignIn(): UseMutationResult<AuthResponse, ApiError, SignInInput> {
  const queryClient = useQueryClient();

  return useMutation<AuthResponse, ApiError, SignInInput>({
    mutationFn: async (input: SignInInput) => {
      const response = await apiClient.post<AuthResponse>('/auth/sign-in', input, {
        skipAuth: true,
      });
      await setTokens(response.tokens.accessToken, response.tokens.refreshToken);
      return response;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data.user);
      queryClient.invalidateQueries();
    },
  });
}

export function useSignUp(): UseMutationResult<AuthResponse, ApiError, SignUpInput> {
  const queryClient = useQueryClient();

  return useMutation<AuthResponse, ApiError, SignUpInput>({
    mutationFn: async (input: SignUpInput) => {
      const response = await apiClient.post<AuthResponse>('/auth/sign-up', input, {
        skipAuth: true,
      });
      await setTokens(response.tokens.accessToken, response.tokens.refreshToken);
      return response;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data.user);
      queryClient.invalidateQueries();
    },
  });
}

export function useCurrentUser(): UseQueryResult<UserProfile, ApiError> {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<UserProfile, ApiError>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      return apiClient.get<UserProfile>('/me');
    },
    enabled: isAuthenticated,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSignOut() {
  return async () => {
    await useAuthStore.getState().signOut();
  };
}

export function useUpdateProfile(): UseMutationResult<
  UserProfile,
  ApiError,
  { name?: string; avatarUrl?: string | null }
> {
  const queryClient = useQueryClient();

  return useMutation<UserProfile, ApiError, { name?: string; avatarUrl?: string | null }>({
    mutationFn: async (input) => {
      return apiClient.patch<UserProfile>('/me', input);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data);
    },
  });
}
