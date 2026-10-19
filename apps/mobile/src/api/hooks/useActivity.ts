import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '../client';
import { ApiError } from '../types';
import { Notification, NotificationPrefs } from '@campaigns/shared';
import { useAuthStore } from '../../store/authStore';

export interface GroupedNotificationsResponse {
  unreadCount: number;
  groups: {
    label: string;
    items: Notification[];
  }[];
}

export function useNotifications(): UseQueryResult<GroupedNotificationsResponse, ApiError> {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<GroupedNotificationsResponse, ApiError>({
    queryKey: ['notifications'],
    queryFn: async () => {
      return apiClient.get<GroupedNotificationsResponse>('/me/notifications');
    },
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 15000 : false, // poll for updates every 15s only when authenticated
  });
}

export function useMarkRead(): UseMutationResult<
  { updatedCount: number },
  ApiError,
  { id?: string; all?: boolean }
> {
  const queryClient = useQueryClient();

  return useMutation<{ updatedCount: number }, ApiError, { id?: string; all?: boolean }>({
    mutationFn: async (body) => {
      return apiClient.post<{ updatedCount: number }>('/me/notifications/read', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useNotificationPrefs(): UseMutationResult<
  NotificationPrefs,
  ApiError,
  Partial<NotificationPrefs>
> {
  const queryClient = useQueryClient();

  return useMutation<NotificationPrefs, ApiError, Partial<NotificationPrefs>>({
    mutationFn: async (prefs) => {
      return apiClient.patch<NotificationPrefs>('/me/notification-prefs', prefs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
