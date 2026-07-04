import { ReviewBrowser } from '@/components/transactions/ReviewBrowser';
import { accountsApi, categoriesApi } from '@/lib/apiClient';

export default async function TransactionReviewPage() {
  const [accounts, categories] = await Promise.all([
    accountsApi.list(),
    categoriesApi.list(),
  ]);

  return <ReviewBrowser accounts={accounts} categories={categories} />;
}
