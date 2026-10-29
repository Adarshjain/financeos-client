'use server';

import { serverApi } from '@/lib/api/server';
import { createDomainAction } from '@/lib/domainApi';

/*
 * Inbox row writes. Keys contain ':'; openapi-fetch percent-encodes path params itself, so the raw key is
 * passed (encoding here too would double-encode it).
 */

/** Clears a row's snooze or dismissal. */
export const undoInboxState = createDomainAction(
  { fallbackError: "Couldn't undo. Try again." },
  async (key: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/inbox/{key}/state', { params: { path: { key } } });
  },
);

export const snoozeInboxItem = createDomainAction(
  { fallbackError: "Couldn't snooze this item. Try again." },
  async (key: string, until: string): Promise<void> => {
    await serverApi.POST('/api/v1/inbox/{key}/snooze', { params: { path: { key } }, body: { until } });
  },
);

export const dismissInboxItem = createDomainAction(
  { fallbackError: "Couldn't dismiss this item. Try again." },
  async (key: string): Promise<void> => {
    await serverApi.POST('/api/v1/inbox/{key}/dismiss', { params: { path: { key } } });
  },
);

/** Links the EPF suggestion's credit to its withdrawal (no TDS). */
export const linkEpfSuggestion = createDomainAction(
  { fallbackError: "Couldn't update this suggestion. Try again." },
  async (epfEntryId: string, transactionId: string): Promise<void> => {
    await serverApi.PUT('/api/v1/epf/entries/{id}/transaction', {
      params: { path: { id: epfEntryId } },
      body: { transactionId, recordTds: false },
    });
  },
);

/** "Not this one": the server stops suggesting this credit (when the row has both ids), then the row is dismissed. */
export const dismissEpfSuggestion = createDomainAction(
  { fallbackError: "Couldn't update this suggestion. Try again." },
  async (key: string, epfEntryId: string | null | undefined, transactionId: string | null | undefined): Promise<void> => {
    if (epfEntryId && transactionId) {
      await serverApi.POST('/api/v1/epf/entries/{id}/suggestion/dismiss', {
        params: { path: { id: epfEntryId } },
        body: { transactionId },
      });
    }
    await serverApi.POST('/api/v1/inbox/{key}/dismiss', { params: { path: { key } } });
  },
);
