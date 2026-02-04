import { Fragment } from 'react';

import { TransactionFormWrapper } from '@/components/transactions/TransactionFormWrapper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { accountsApi, categoriesApi, transactionsApi } from '@/lib/apiClient';
import { Transaction } from '@/lib/transaction.types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

export default async function TransactionsPage() {
  const [transactionsData, accounts, categories] = await Promise.all([
    transactionsApi.list(),
    accountsApi.list(),
    categoriesApi.list(),
  ]);

  const transactions: Transaction[] = transactionsData.content;

  const getAccountName = (accountId: string | undefined) => {
    if (!accountId) return '—';
    const account = accounts.find((a) => a.id === accountId);
    return account?.name || 'Unknown';
  };

  const TransactionCard = ({ transaction }: { transaction: Transaction; }) => {
    return <>
      <div className="flex-1 py-2 flex items-start justify-between border-2 rounded-md relative mb-2 px-2">
        <div className="flex flex-col gap-1 text-sm">
          <div className="break-all font-medium">{transaction.description}</div>
          <div className="min-w-max">{getAccountName(transaction.accountId)}</div>
          <div>{transaction.categories?.map(
            category => <Badge variant="outline" className="mr-1 rounded px-1" key={category.id}>{category.name}</Badge>,
          )}</div>
        </div>
        <div>
          <div
            className={cn(
              'font-bold text-lg whitespace-nowrap text-right min-w-[100px]',
              transaction.amount >= 0 ? 'text-emerald-500' : 'text-rose-500',
            )}>{formatMoney(Math.abs(transaction.amount))}</div>
          <div className="text-right text-sm mt-1 mr-0.5">{formatMoney(transaction.balance)}</div>
        </div>
      </div>
    </>;
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between px-4 pt-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transactions</h1>
        <TransactionFormWrapper categories={categories} accounts={accounts} trigger={<Button>Create</Button>} />
      </div>

      <div className="px-2">
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
                <TransactionFormWrapper
                  categories={categories}
                  accounts={accounts}
                  transaction={transaction}
                  trigger={<TransactionCard transaction={transaction} />}
                />
              </Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}
