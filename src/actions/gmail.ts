'use server';

import { gmailApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import type {
  GmailSenderRequest,
} from '@/lib/types';

const SETTINGS_PATHS = ['/settings', '/transactions'];

export const startGmailOAuth = createDomainAction(
  { fallbackError: 'Failed to start Gmail OAuth' },
  () => gmailApi.startOAuth()
);

export const syncGmail = createDomainAction(
  { fallbackError: 'Failed to sync Gmail', revalidatePaths: SETTINGS_PATHS },
  () => gmailApi.sync()
);

export const listGmailSenders = createDomainAction(
  { fallbackError: 'Failed to list Gmail senders' },
  () => gmailApi.listSenders()
);

export const createGmailSender = createDomainAction(
  { fallbackError: 'Failed to create Gmail sender', revalidatePaths: ['/settings'] },
  (data: GmailSenderRequest) => gmailApi.createSender(data)
);

export const updateGmailSender = createDomainAction(
  { fallbackError: 'Failed to update Gmail sender', revalidatePaths: ['/settings'] },
  (id: string, data: GmailSenderRequest) => gmailApi.updateSender(id, data)
);

export const deleteGmailSender = createDomainAction(
  { fallbackError: 'Failed to delete Gmail sender', revalidatePaths: ['/settings'] },
  (id: string) => gmailApi.deleteSender(id)
);

export const listGmailConnections = createDomainAction(
  { fallbackError: 'Failed to list Gmail connections' },
  () => gmailApi.listConnections()
);

export const disconnectGmailConnection = createDomainAction(
  { fallbackError: 'Failed to disconnect Gmail connection', revalidatePaths: ['/settings'] },
  (id: string) => gmailApi.disconnectConnection(id)
);

export const getGmailAttentionItems = createDomainAction(
  { fallbackError: 'Failed to fetch Gmail attention items' },
  (page = 0, size = 20, includeRetryable = false) => gmailApi.getAttentionItems(page, size, includeRetryable)
);

export const retryGmailAttentionItem = createDomainAction(
  { fallbackError: 'Failed to retry Gmail attention item', revalidatePaths: ['/settings'] },
  (ledgerId: string) => gmailApi.retryAttentionItem(ledgerId)
);

export const rescanGmail = createDomainAction(
  { fallbackError: 'Failed to start Gmail rescan', revalidatePaths: ['/settings'] },
  (fromDate: string) => gmailApi.rescan(fromDate)
);
