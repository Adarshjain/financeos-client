'use server';

import { serverApi } from '@/lib/api/server';
import type { AssignAttentionRequest, GmailSenderRequest } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';

export interface GmailAttentionQuery {
  page: number;
  size: number;
  includeRetryable: boolean;
  archived?: boolean;
}

export const loadGmailConnections = createDomainAction(
  { fallbackError: "Couldn't load the mailboxes. Try again." },
  async () => (await serverApi.GET('/api/v1/gmail/connections')).data ?? [],
);

export const loadGmailSenders = createDomainAction(
  { fallbackError: "Couldn't load the senders. Try again." },
  async () => (await serverApi.GET('/api/v1/gmail/senders')).data ?? [],
);

export const loadGmailAttention = createDomainAction(
  { fallbackError: "Couldn't load the emails that need attention. Try again." },
  async (query: GmailAttentionQuery) => {
    const { data } = await serverApi.GET('/api/v1/gmail/attention', { params: { query } });
    return data ?? null;
  },
);

export const startGmailOAuth = createDomainAction(
  { fallbackError: "Couldn't connect Gmail. Try again." },
  async () => (await serverApi.GET('/api/v1/gmail/oauth/start')).data ?? null,
);

export const syncGmail = createDomainAction(
  { fallbackError: "Couldn't sync Gmail. Try again." },
  async () => (await serverApi.POST('/api/v1/gmail/sync')).data ?? null,
);

export const disconnectGmail = createDomainAction(
  { fallbackError: "Couldn't disconnect Gmail. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/gmail/connections/{id}', { params: { path: { id } } });
  },
);

export const retryGmailAttention = createDomainAction(
  { fallbackError: "Couldn't retry the item. Try again." },
  async (ledgerId: string) =>
    (await serverApi.POST('/api/v1/gmail/attention/{ledgerId}/retry', { params: { path: { ledgerId } } })).data ?? null,
);

export const archiveGmailAttention = createDomainAction(
  { fallbackError: "Couldn't archive the item. Try again." },
  async (ledgerId: string): Promise<void> => {
    await serverApi.POST('/api/v1/gmail/attention/{ledgerId}/archive', { params: { path: { ledgerId } } });
  },
);

export const unarchiveGmailAttention = createDomainAction(
  { fallbackError: "Couldn't unarchive the item. Try again." },
  async (ledgerId: string): Promise<void> => {
    await serverApi.POST('/api/v1/gmail/attention/{ledgerId}/unarchive', { params: { path: { ledgerId } } });
  },
);

export const assignGmailAttention = createDomainAction(
  { fallbackError: "Couldn't assign the identifier. Try again." },
  async (ledgerId: string, body: AssignAttentionRequest) =>
    (await serverApi.POST('/api/v1/gmail/attention/{ledgerId}/assign', { params: { path: { ledgerId } }, body })).data ?? null,
);

export const createGmailSender = createDomainAction(
  { fallbackError: "Couldn't add the sender. Try again." },
  async (body: GmailSenderRequest) => (await serverApi.POST('/api/v1/gmail/senders', { body })).data ?? null,
);

export const updateGmailSender = createDomainAction(
  { fallbackError: "Couldn't update the sender. Try again." },
  async (id: string, body: GmailSenderRequest) =>
    (await serverApi.PUT('/api/v1/gmail/senders/{id}', { params: { path: { id } }, body })).data ?? null,
);

export const deleteGmailSender = createDomainAction(
  { fallbackError: "Couldn't delete the sender. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/gmail/senders/{id}', { params: { path: { id } } });
  },
);
