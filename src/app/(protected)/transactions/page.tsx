import { TransactionsBrowser } from '@/components/transactions/TransactionsBrowser';
import { accountsApi, categoriesApi, transactionsApi } from '@/lib/apiClient';

export default async function TransactionsPage() {
  const [accounts, categories, reviewPagedData] = await Promise.all([
    accountsApi.list(),
    categoriesApi.list(),
    transactionsApi.search({
      filters: [{ field: 'reviewType', operator: 'is', value: 'NEEDS_REVIEW' }],
    }, 0, 1).catch(() => null),
  ]);

  // `null` means "couldn't determine", which is distinct from a genuine zero.
  // Coercing the failure to 0 made a backend hiccup look like "nothing to
  // review". The badge is suppressed when unknown; the Review link itself stays
  // reachable either way. The count is only decorative, so a failure here must
  // not fail the whole page.
  const needsReviewCount = reviewPagedData?.totalElements ?? null;

  return (
    <TransactionsBrowser
      accounts={accounts}
      categories={categories}
      needsReviewCount={needsReviewCount}
    />
  );
}
