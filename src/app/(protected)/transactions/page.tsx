import { Fragment } from 'react';

import { TransactionCard } from '@/components/transactions/TransactionCard';
import { TransactionFormWrapper } from '@/components/transactions/TransactionFormWrapper';
import { Button } from '@/components/ui/button';
import { accountsApi, categoriesApi, transactionsApi } from '@/lib/apiClient';
import { Transaction } from '@/lib/transaction.types';
import { formatDate } from '@/lib/utils';

export default async function TransactionsPage() {
  const [transactionsData, accounts, categories] = await Promise.all([
    transactionsApi.list(),
    accountsApi.list(),
    categoriesApi.list(),
  ]);

  const transactions: Transaction[] = transactionsData.content;

  return (
    <div className="space-y-3">
      <div className="flex justify-between px-4 pt-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transactions</h1>
        <TransactionFormWrapper categories={categories} accounts={accounts} trigger={<Button>Create</Button>} />
      </div>

      <div className="px-2 pb-14">
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600 dark:text-slate-400 mb-2">
              No transactions yet
            </p>
            <p className="text-sm text-slate-500">
              Add your first transaction to start tracking!
            </p>
          </div>
        ) : (
          transactions.map((transaction, index) => {
            const showDate = index === 0 || transaction.date !== transactions[index - 1].date;
            return (
              <Fragment key={transaction.id}>
                {showDate && <div
                  className="text-lg font-medium pl-2 pb-1 pt-2 sticky top-0 bg-slate-50 z-10"
                >{formatDate(transaction.date)}</div>}
                <TransactionCard categories={categories} accounts={accounts} transaction={transaction} />
              </Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}
