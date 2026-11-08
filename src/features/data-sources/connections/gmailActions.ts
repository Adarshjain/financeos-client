'use server';

import { serverApi } from '@/lib/api/server';
import type { AssignAttentionRequest, AssignNumberGroupRequest, AttentionBulkRequest, GmailSenderRequest, NumberGroupRequest } from '@/lib/api/types';
import { gmailApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';

export interface GmailAttentionQuery {
  page: number;
  size: number;
  includeRetryable: boolean;
  archived?: boolean;
  reason?: AttentionBulkRequest['reason'];
}

export const loadGmailConnections = createDomainAction(
  { fallbackError: "Couldn't load the mailboxes. Try again." },
  async () => (await serverApi.GET('/api/v1/gmail/connections')).data ?? [],
);

export const loadGmailSenders = createDomainAction(
  { fallbackError: "Couldn't load the senders. Try again." },
  async () => (await serverApi.GET('/api/v1/gmail/senders')).data ?? [],
);

export const loadBankDomains = createDomainAction(
  { fallbackError: "Couldn't load the bank's domains. Try again." },
  async () => (await serverApi.GET('/api/v1/gmail/bank-domains')).data ?? [],
);

export const loadGmailAttention = createDomainAction(
  { fallbackError: "Couldn't load the emails that need attention. Try again." },
  async (query: GmailAttentionQuery) => {
    const { data } = await serverApi.GET('/api/v1/gmail/attention', { params: { query } });
    return data ?? null;
  },
);

export interface GmailUngroupedQuery {
  page: number;
  size: number;
  includeRetryable: boolean;
  archived?: boolean;
  reason?: AttentionBulkRequest['reason'];
}

/** The attention emails that belong to no group (no unknown number, not import-off); `archived` lists every archived one, `reason` keeps one reason. */
export const loadGmailUngrouped = createDomainAction(
  { fallbackError: "Couldn't load the emails that need attention. Try again." },
  async (query: GmailUngroupedQuery) => {
    const { data } = await serverApi.GET('/api/v1/gmail/attention/ungrouped', { params: { query } });
    return data ?? null;
  },
);

export const loadGmailAttentionGroups = createDomainAction(
  { fallbackError: "Couldn't load the emails that need attention. Try again." },
  async () => (await serverApi.GET('/api/v1/gmail/attention/groups')).data ?? null,
);

/** One page of the emails in an unknown-number group, newest first. */
export const loadNumberEmails = createDomainAction(
  { fallbackError: "Couldn't load the emails of this number. Try again." },
  async (query: { bank?: string; last4: string; page: number; size: number }) =>
    (await serverApi.GET('/api/v1/gmail/attention/numbers/emails', { params: { query } })).data ?? null,
);

export const assignGmailNumber = createDomainAction(
  { fallbackError: "Couldn't add the number to the account. Try again." },
  async (body: AssignNumberGroupRequest) => (await serverApi.POST('/api/v1/gmail/attention/numbers/assign', { body })).data ?? null,
);

export const ignoreGmailNumber = createDomainAction(
  { fallbackError: "Couldn't ignore the number. Try again." },
  async (body: NumberGroupRequest) => (await serverApi.POST('/api/v1/gmail/attention/numbers/ignore', { body })).data ?? null,
);

export const unignoreGmailNumber = createDomainAction(
  { fallbackError: "Couldn't stop ignoring the number. Try again." },
  async (id: string) =>
    (await serverApi.DELETE('/api/v1/gmail/attention/numbers/ignored/{id}', { params: { path: { id } } })).data ?? null,
);

export const loadGmailAttentionSummary = createDomainAction(
  { fallbackError: "Couldn't load the emails that need attention. Try again." },
  async (includeRetryable: boolean, ungroupedOnly = false) =>
    (await serverApi.GET('/api/v1/gmail/attention/summary', { params: { query: { includeRetryable, ...(ungroupedOnly ? { ungroupedOnly } : {}) } } })).data ?? [],
);

export const retryAllGmailAttention = createDomainAction(
  { fallbackError: "Couldn't retry the items. Try again." },
  async (body: AttentionBulkRequest) =>
    (await serverApi.POST('/api/v1/gmail/attention/retry-all', { body })).data ?? null,
);

export const archiveAllGmailAttention = createDomainAction(
  { fallbackError: "Couldn't archive the items. Try again." },
  async (body: AttentionBulkRequest) =>
    (await serverApi.POST('/api/v1/gmail/attention/archive-all', { body })).data ?? null,
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

/** One mail, read live from the user's Gmail for "View email" (the server stores nothing). */
export const loadEmailContent = createDomainAction(
  { fallbackError: "Couldn't load this email. Try again." },
  async (ledgerId: string) => gmailApi.getMessageContent(ledgerId),
);
