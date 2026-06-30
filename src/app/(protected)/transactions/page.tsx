import { TransactionsBrowser } from '@/components/transactions/TransactionsBrowser';
import { accountsApi, categoriesApi } from '@/lib/apiClient';

export default async function TransactionsPage() {
  const [accounts, categories] = await Promise.all([
    accountsApi.list(),
    categoriesApi.list(),
  ]);

  return <TransactionsBrowser accounts={accounts} categories={categories} />;
}
