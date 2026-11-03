'use server';

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

/** The scan's progress, polled while the "Finding your accounts" card shows. */
export const loadScanState = createDomainAction(
  { fallbackError: "Couldn't read scan progress. Try again." },
  async () => (await accountSuggestionsApi.list()).scan,
);
