import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { DeletionSummaryResponse } from '@/lib/types';

/** What deleting the account removes; fetched only while the delete dialog is open. */
export function useDeletionSummary(enabled: boolean) {
  return useQuery({
    queryKey: keys.settings.deletionSummary(),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/auth/me/deletion-summary');
      return data ?? null;
    },
    enabled,
    // A failed summary must not block the deletion flow, so no retries.
    retry: false,
  });
}

/** One line of counts for the dialog ("3 accounts · 120 transactions"). */
export function formatDeletionSummary(summaryData: DeletionSummaryResponse): string {
  const parts: string[] = [];
  const counts = summaryData.counts;

  if (counts.accounts) {
    parts.push(`${counts.accounts.toLocaleString()} account${counts.accounts === 1 ? '' : 's'}`);
  }
  if (counts.transactions) {
    parts.push(`${counts.transactions.toLocaleString()} transaction${counts.transactions === 1 ? '' : 's'}`);
  }
  if (counts.holdings || counts.investment_transactions) {
    const invCount = (counts.holdings || 0) + (counts.investment_transactions || 0);
    parts.push(`${invCount.toLocaleString()} investment record${invCount === 1 ? '' : 's'}`);
  }
  if (counts.loans || counts.lendings) {
    const loanCount = (counts.loans || 0) + (counts.lendings || 0);
    parts.push(`${loanCount.toLocaleString()} loan / lending record${loanCount === 1 ? '' : 's'}`);
  }
  if (counts.category_rules || counts.reward_rules) {
    const ruleCount = (counts.category_rules || 0) + (counts.reward_rules || 0);
    parts.push(`${ruleCount.toLocaleString()} rule${ruleCount === 1 ? '' : 's'}`);
  }

  if (parts.length === 0) {
    return summaryData.total > 0
      ? `${summaryData.total.toLocaleString()} total associated records`
      : 'No financial records found';
  }

  return parts.join(' · ');
}
