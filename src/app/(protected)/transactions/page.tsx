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

  const needsReviewCount = reviewPagedData?.totalElements ?? 0;

  return (
    <TransactionsBrowser
      accounts={accounts}
      categories={categories}
      needsReviewCount={needsReviewCount}
    />
  );
}
