'use server';

import { serverApi } from '@/lib/api/server';
import type {
  LoanResponse,
  NotificationSettingsResponse,
  PushSubscriptionRequest,
  UpdateNotificationSettingsRequest,
} from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';

export const loadNotificationSettings = createDomainAction(
  { fallbackError: "Couldn't load the notification settings. Try again." },
  async (): Promise<NotificationSettingsResponse | null> =>
    (await serverApi.GET('/api/v1/notifications/settings')).data ?? null,
);

export const loadPushPublicKey = createDomainAction(
  { fallbackError: "Couldn't load the push key. Try again." },
  async () => (await serverApi.GET('/api/v1/notifications/push/public-key')).data ?? null,
);

/** The active loans the mute list offers. */
export const loadActiveLoans = createDomainAction(
  { fallbackError: "Couldn't load the loans. Try again." },
  async (query: { status: 'active'; page: number; size: number }): Promise<LoanResponse[]> => {
    const { data } = await serverApi.GET('/api/v1/loans', { params: { query } });
    return (data?.content ?? []) as LoanResponse[];
  },
);

export const updateNotificationSettings = createDomainAction(
  { fallbackError: "Couldn't save notification settings. Try again." },
  async (body: UpdateNotificationSettingsRequest) =>
    (await serverApi.PUT('/api/v1/notifications/settings', { body })).data!,
);

export const subscribePush = createDomainAction(
  { fallbackError: "Couldn't enable notifications. Try again." },
  async (body: PushSubscriptionRequest) =>
    (await serverApi.POST('/api/v1/notifications/push/subscriptions', { body })).data!,
);

export const unsubscribePush = createDomainAction(
  { fallbackError: "Couldn't disable notifications. Try again." },
  async (endpoint: string) =>
    (await serverApi.POST('/api/v1/notifications/push/subscriptions/remove', { body: { endpoint } })).data!,
);

/** Removing another device from the list; the same call as `unsubscribePush`, with its own error copy. */
export const removePushDevice = createDomainAction(
  { fallbackError: "Couldn't remove the device. Try again." },
  async (endpoint: string) =>
    (await serverApi.POST('/api/v1/notifications/push/subscriptions/remove', { body: { endpoint } })).data!,
);

export const muteAccount = createDomainAction(
  { fallbackError: "Couldn't update the card. Try again." },
  async (accountId: string, muted: boolean) =>
    (await serverApi.PUT('/api/v1/notifications/accounts/{accountId}/mute', { params: { path: { accountId } }, body: { muted } })).data!,
);

export const muteLoanNotifications = createDomainAction(
  { fallbackError: "Couldn't update the loan. Try again." },
  async (loanId: string, muted: boolean) =>
    (await serverApi.PUT('/api/v1/notifications/loans/{loanId}/mute', { params: { path: { loanId } }, body: { muted } })).data!,
);

export const sendTestNotification = createDomainAction(
  { fallbackError: "Couldn't send the test notification. Try again." },
  async () => (await serverApi.POST('/api/v1/notifications/push/test')).data!,
);
