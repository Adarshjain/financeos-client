'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type {
  NotificationSettingsResponse,
  PushSubscriptionRequest,
  UpdateNotificationSettingsRequest,
} from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

export function useNotificationSettings(initialData?: NotificationSettingsResponse) {
  return useQuery({
    queryKey: keys.settings.notifications(),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/notifications/settings');
      return data ?? null;
    },
    initialData,
  });
}

export function usePushPublicKey(enabled = true) {
  return useQuery({
    queryKey: keys.settings.pushPublicKey(),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/notifications/push/public-key');
      return data ?? null;
    },
    enabled,
    staleTime: 60 * 60 * 1000,
  });
}

/** Every write returns the full settings view, so the cache is replaced rather than refetched. */
export function useNotificationSettingsMutations() {
  const qc = useQueryClient();
  const store = (settings: NotificationSettingsResponse) => {
    qc.setQueryData(keys.settings.notifications(), settings);
  };

  const update = useMutation({
    mutationFn: (body: UpdateNotificationSettingsRequest) =>
      api.PUT('/api/v1/notifications/settings', { body }).then((r) => r.data!),
    onSuccess: store,
  });

  const subscribe = useMutation({
    mutationFn: (body: PushSubscriptionRequest) =>
      api.POST('/api/v1/notifications/push/subscriptions', { body }).then((r) => r.data!),
    onSuccess: store,
  });

  const unsubscribe = useMutation({
    mutationFn: (endpoint: string) =>
      api.POST('/api/v1/notifications/push/subscriptions/remove', { body: { endpoint } }).then((r) => r.data!),
    onSuccess: store,
  });

  const mute = useMutation({
    mutationFn: ({ accountId, muted }: { accountId: string; muted: boolean }) =>
      api
        .PUT('/api/v1/notifications/accounts/{accountId}/mute', { params: { path: { accountId } }, body: { muted } })
        .then((r) => r.data!),
    onSuccess: (settings) => {
      store(settings);
      // Bills carry the muted flag too.
      void qc.invalidateQueries({ queryKey: keys.bills.all });
    },
  });

  const muteLoan = useMutation({
    mutationFn: ({ loanId, muted }: { loanId: string; muted: boolean }) =>
      api
        .PUT('/api/v1/notifications/loans/{loanId}/mute', { params: { path: { loanId } }, body: { muted } })
        .then((r) => r.data!),
    onSuccess: (settings) => {
      store(settings);
      // Loan responses carry the muted flag too.
      void qc.invalidateQueries({ queryKey: keys.loans.all });
    },
  });

  const sendTest = useMutation({
    mutationFn: () => api.POST('/api/v1/notifications/push/test').then((r) => r.data!),
  });

  return { update, subscribe, unsubscribe, mute, muteLoan, sendTest };
}
