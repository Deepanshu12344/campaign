import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '../client';
import { ApiError } from '../types';
import { Notification, NotificationPrefs } from '@campaigns/shared';

export interface GroupedNotificationsResponse {
  unreadCount: number;
  groups: {
    label: string;
    items: Notification[];
  }[];
}

export function useNotifications(): UseQueryResult<GroupedNotificationsResponse, ApiError> {
  return useQuery<GroupedNotificationsResponse, ApiError>({
    queryKey: ['notifications'],
    queryFn: async () => {
      return apiClient.get<GroupedNotificationsResponse>('/me/notifications');
    },
    refetchInterval: 15000, // poll for updates every 15s when active
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
