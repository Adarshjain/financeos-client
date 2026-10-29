import { useQuery } from '@tanstack/react-query';

import { loadDeletionSummary } from '@/features/settings/profile/deletionSummaryActions';
import { unwrapAction } from '@/lib/actionResult';
import { formatCount } from '@/lib/format';
import { keys } from '@/lib/query/keys';
import type { DeletionSummaryResponse } from '@/lib/types';

/** What deleting the account removes; fetched only while the delete dialog is open. */
export function useDeletionSummary(enabled: boolean) {
  return useQuery({
    queryKey: keys.settings.deletionSummary(),
    queryFn: () => unwrapAction(loadDeletionSummary()),
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
    parts.push(formatCount(counts.accounts, ['account', 'accounts']));
  }
  if (counts.transactions) {
    parts.push(formatCount(counts.transactions, ['transaction', 'transactions']));
  }
  if (counts.holdings || counts.investment_transactions) {
    const invCount = (counts.holdings || 0) + (counts.investment_transactions || 0);
    parts.push(formatCount(invCount, ['investment record', 'investment records']));
  }
  if (counts.loans || counts.lendings) {
    const loanCount = (counts.loans || 0) + (counts.lendings || 0);
    parts.push(formatCount(loanCount, ['loan / lending record', 'loan / lending records']));
  }
  if (counts.category_rules || counts.reward_rules) {
    const ruleCount = (counts.category_rules || 0) + (counts.reward_rules || 0);
    parts.push(formatCount(ruleCount, ['rule', 'rules']));
  }

  if (parts.length === 0) {
    return summaryData.total > 0
      ? `${formatCount(summaryData.total)} total associated records`
      : 'No financial records yet';
  }

  return parts.join(' · ');
}
