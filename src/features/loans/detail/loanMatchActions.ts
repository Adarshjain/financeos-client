'use server';

import { loansApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import type { MatchSuggestionsResponse } from '@/lib/loan.types';
import { action } from '@/lib/observability/action';

/** The bank debits the server finds for this loan's due and overdue EMIs (the matching tolerance is the server's). */
export const loadLoanMatches = action('loanMatch.loadLoanMatches', createDomainAction(
  { fallbackError: "Couldn't find matching bank transactions. Try again." },
  async (loanId: string): Promise<MatchSuggestionsResponse> => loansApi.getMatchSuggestions(loanId),
));
