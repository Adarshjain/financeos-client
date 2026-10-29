import { notFound } from 'next/navigation';
import { cache } from 'react';

import { signInIfSessionEnded } from '@/features/shell/loadHelpers';
import { clampPage } from '@/features/shell/pagination';
import { ApiError } from '@/lib/api/client';
import { counterpartiesApi } from '@/lib/apiClient';
import type { CounterpartyLedgerResponse, PersonCounterparty } from '@/lib/lending.types';

import type { PersonUrlState } from './personModel';

export interface PersonPageData {
  cp: PersonCounterparty;
  /** The page the URL asks for (or the last one when it is past the end), newest first, each with the balance after it. */
  ledger: CounterpartyLedgerResponse;
  /** The URL state with the page clamped to the pages that exist. */
  state: PersonUrlState;
}

/** The person for a route (also read by the tab title, so once per render pass); a person who does not exist is a 404. */
export const loadPerson = cache(async (id: string): Promise<PersonCounterparty> => {
  const cp = await counterpartiesApi.get(id).catch(async (e: unknown) => {
    await signInIfSessionEnded(e);
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  });
  if (!cp) notFound();
  return cp as PersonCounterparty;
});

/**
 * The person and their ledger page, one request pass per render. A page past the end (a stale link, or the last entry
 * of the last page deleted) shows the last page instead. A person who does not exist is a 404; any other failure
 * throws to the route's error state.
 */
export const loadPersonPage = cache(async (id: string, state: PersonUrlState): Promise<PersonPageData> => {
  const cp = await loadPerson(id);
  let ledger = await counterpartiesApi.ledger(id, state.page, state.size);
  const totalPages = ledger.entries.totalPages;
  if (totalPages > 0 && state.page >= totalPages) {
    state = { ...state, page: clampPage(state.page, totalPages) };
    ledger = await counterpartiesApi.ledger(id, state.page, state.size);
  }
  return { cp, ledger, state };
});
