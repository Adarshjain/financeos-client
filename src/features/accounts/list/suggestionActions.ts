'use server';

import type { Schemas } from '@/lib/api/types';
import { accountSuggestionsApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';

/** "Not mine": hides the suggestion until it is undone. */
export const hideSuggestion = createDomainAction(
  { fallbackError: "Couldn't hide this. Try again." },
  async (id: string): Promise<void> => accountSuggestionsApi.notMine(id),
);

export const undoHideSuggestion = createDomainAction(
  { fallbackError: "Couldn't undo. Try again." },
  async (id: string): Promise<void> => accountSuggestionsApi.undo(id),
);

/** The answer to "Is this your {account}?". */
export const answerIsThis = createDomainAction(
  { fallbackError: "Couldn't save your answer. Try again." },
  async (id: string, accountId: string, yes: boolean): Promise<void> => accountSuggestionsApi.isThis(id, accountId, yes),
);

/** "Part of another account": files the suggestion's number under an account we have. */
export const saveBelongs = createDomainAction(
  { fallbackError: "Couldn't save this. Try again." },
  async (id: string, body: Schemas['BelongsRequest']): Promise<void> => accountSuggestionsApi.belongs(id, body),
);

/** "No" to "Older number on {account}?". */
export const declineOlderNumber = createDomainAction(
  { fallbackError: "Couldn't save your answer. Try again." },
  async (id: string): Promise<void> => accountSuggestionsApi.notPart(id),
);

/** The scan's progress, polled while the "Finding your accounts" card shows. */
export const loadScanState = createDomainAction(
  { fallbackError: "Couldn't read scan progress. Try again." },
  async () => (await accountSuggestionsApi.list()).scan,
);
