'use server';

import { serverApi } from '@/lib/api/server';
import { createDomainAction } from '@/lib/domainApi';
import { action } from '@/lib/observability/action';

/*
 * Inbox row writes. Keys contain ':'; openapi-fetch percent-encodes path params itself, so the raw key is
 * passed (encoding here too would double-encode it).
 */

/** Clears a row's snooze or dismissal. */
export const undoInboxState = action('inbox.inbox.undoInboxState', createDomainAction(
  { fallbackError: "Couldn't undo. Try again." },
  async (key: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/inbox/{key}/state', { params: { path: { key } } });
  },
));

export const snoozeInboxItem = action('inbox.inbox.snoozeInboxItem', createDomainAction(
  { fallbackError: "Couldn't snooze this item. Try again." },
  async (key: string, until: string): Promise<void> => {
    await serverApi.POST('/api/v1/inbox/{key}/snooze', { params: { path: { key } }, body: { until } });
  },
));

export const dismissInboxItem = action('inbox.inbox.dismissInboxItem', createDomainAction(
  { fallbackError: "Couldn't dismiss this item. Try again." },
  async (key: string): Promise<void> => {
    await serverApi.POST('/api/v1/inbox/{key}/dismiss', { params: { path: { key } } });
  },
));

/** Links the EPF suggestion's credit to its withdrawal (no TDS). */
export const linkEpfSuggestion = action('inbox.inbox.linkEpfSuggestion', createDomainAction(
  { fallbackError: "Couldn't update this suggestion. Try again." },
  async (epfEntryId: string, transactionId: string): Promise<void> => {
    await serverApi.PUT('/api/v1/epf/entries/{id}/transaction', {
      params: { path: { id: epfEntryId } },
      body: { transactionId, recordTds: false },
    });
  },
));

/** "Not this one": the server stops suggesting this credit (when the row has both ids), then the row is dismissed. */
export const dismissEpfSuggestion = action('inbox.inbox.dismissEpfSuggestion', createDomainAction(
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
));

/** A new NPS account found in Gmail: add it as the user's own or their child's. */
export const addNpsPendingAccount = action('inbox.inbox.addNpsPendingAccount', createDomainAction(
  { fallbackError: "Couldn't add the account. Try again." },
  async (key: string, relation: 'SELF' | 'CHILD'): Promise<{ importing: number }> => {
    const { data } = await serverApi.POST('/api/v1/nps/gmail-detections/{key}/account', { params: { path: { key } }, body: { relation } });
    return { importing: data?.importing ?? 0 };
  },
));

/** Ignore an NPS account Gmail found. */
export const ignoreNpsPending = action('inbox.inbox.ignoreNpsPending', createDomainAction(
  { fallbackError: "Couldn't ignore this. Try again." },
  async (key: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/nps/gmail-detections/{key}', { params: { path: { key } } });
  },
));

/** "Not NPS" on the "Looks like you invest in NPS" suggestion: it stops being offered. */
export const markNpsSetupNotNps = action('inbox.inbox.markNpsSetupNotNps', createDomainAction(
  { fallbackError: "Couldn't update this. Try again." },
  async (): Promise<void> => {
    await serverApi.POST('/api/v1/nps/setup/not-nps');
  },
));

/** Links a bank payment to an NPS contribution (an Inbox pairing the user confirms). */
export const linkNpsContribution = action('inbox.inbox.linkNpsContribution', createDomainAction(
  { fallbackError: "Couldn't link the payment. Try again." },
  async (npsEntryId: string, transactionId: string): Promise<void> => {
    await serverApi.POST('/api/v1/nps/entries/{id}/transaction', { params: { path: { id: npsEntryId } }, body: { transactionId } });
  },
));

/** "Not this one": the server stops pairing this payment with this contribution. */
export const dismissNpsLink = action('inbox.inbox.dismissNpsLink', createDomainAction(
  { fallbackError: "Couldn't update this suggestion. Try again." },
  async (npsEntryId: string, transactionId: string): Promise<void> => {
    await serverApi.POST('/api/v1/nps/entries/{id}/suggestion/dismiss', { params: { path: { id: npsEntryId } }, body: { transactionId } });
  },
));

/** Records a bank debit as an NPS contribution (the tier and account are optional: the server defaults them). */
export const recordNpsPayment = action('inbox.inbox.recordNpsPayment', createDomainAction(
  { fallbackError: "Couldn't record the contribution. Try again." },
  async (transactionId: string, accountId?: string, tier?: 'I' | 'II'): Promise<void> => {
    await serverApi.POST('/api/v1/nps/transactions/{txnId}/record', { params: { path: { txnId: transactionId } }, body: { accountId, tier } });
  },
));

/** "Not NPS": the debit stops being offered as a contribution to record. */
export const markNotNps = action('inbox.inbox.markNotNps', createDomainAction(
  { fallbackError: "Couldn't update this payment. Try again." },
  async (transactionId: string): Promise<void> => {
    await serverApi.POST('/api/v1/nps/transactions/{txnId}/not-nps', { params: { path: { txnId: transactionId } } });
  },
));

/** The own active accounts a debit could be recorded to: the one to name (when there is exactly one) and whether Tier II is open. */
export const loadNpsRecordTarget = action('inbox.inbox.loadNpsRecordTarget', createDomainAction(
  { fallbackError: "Couldn't load the NPS accounts." },
  async (): Promise<{ accountId: string | null; tier2: boolean }> => {
    const { data } = await serverApi.GET('/api/v1/nps/summary');
    const own = (data?.accounts ?? []).filter((a) => a.relation === 'SELF' && a.status === 'ACTIVE');
    return { accountId: own.length === 1 ? own[0].id : null, tier2: own.some((a) => a.tier2Active) };
  },
));
