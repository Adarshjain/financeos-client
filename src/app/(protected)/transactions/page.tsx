import { Badge } from '@/components/ui/badge';
import { Card, CardContent,CardHeader, CardTitle } from '@/components/ui/card';
import {
  DataList,
  DataListItem,
  DataListLabel,
  DataListRow,
  DataListValue,
} from '@/components/ui/data-list';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { accountsApi,transactionsApi } from '@/lib/api-client';
import type { AccountResponse,TransactionResponse } from '@/lib/types';
import { formatDate,formatMoney } from '@/lib/utils';

import { CreateTransactionForm } from './create-transaction-form';

export default async function TransactionsPage() {
  const [transactionsData, accounts] = await Promise.all([
    transactionsApi.list(),
    accountsApi.list(),
  ]);

  const transactions: TransactionResponse[] =
    transactionsData.content as TransactionResponse[];

  const getAccountName = (accountId: string | undefined) => {
    if (!accountId) return '—';
    const account = accounts.find((a: AccountResponse) => a.id === accountId);
    return account?.name || 'Unknown';
  };

  const isExpense = (amount: number | string | undefined): boolean => {
    if (amount === undefined) return false;
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num < 0;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Transactions
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Track your income and expenses
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions ({transactions.length})</CardTitle>
            </CardHeader>
            <CardContent>
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
                <>
                  {/* Mobile View */}
                  <div className="lg:hidden">
                    <DataList>
                      {transactions.map((transaction) => (
                        <DataListItem key={transaction.id}>
                          <DataListRow>
                            <DataListLabel>Description</DataListLabel>
                            <DataListValue className="font-medium">
                              {transaction.description}
                            </DataListValue>
                          </DataListRow>
                          <DataListRow>
                            <DataListLabel>Amount</DataListLabel>
                            <DataListValue
                              className={`font-mono font-medium ${isExpense(transaction.amount) ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                            >
                              {formatMoney(transaction.amount)}
                            </DataListValue>
                          </DataListRow>
                          {transaction.category && (
                            <DataListRow>
                              <DataListLabel>Category</DataListLabel>
                              <DataListValue>
                                <Badge variant="secondary">
                                  {transaction.category}
                                </Badge>
                              </DataListValue>
                            </DataListRow>
                          )}
                          <DataListRow>
                            <DataListLabel>Account</DataListLabel>
                            <DataListValue className="text-slate-600 dark:text-slate-400">
                              {getAccountName(transaction.accountId)}
                            </DataListValue>
                          </DataListRow>
                          <DataListRow>
                            <DataListLabel>Date</DataListLabel>
                            <DataListValue className="text-slate-600 dark:text-slate-400">
                              {formatDate(transaction.date)}
                            </DataListValue>
                          </DataListRow>
                          <DataListRow>
                            <DataListLabel>Source</DataListLabel>
                            <DataListValue>
                              <Badge
                                variant={
                                  transaction.source === 'gmail'
                                    ? 'info'
                                    : 'default'
                                }
                              >
                                {transaction.source === 'gmail'
                                  ? 'Gmail'
                                  : 'Manual'}
                              </Badge>
                            </DataListValue>
                          </DataListRow>
                        </DataListItem>
                      ))}
                    </DataList>
                  </div>

                  {/* Desktop View */}
                  <div className="hidden lg:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="text-slate-600 dark:text-slate-400">
                              {formatDate(transaction.date)}
                            </TableCell>
                            <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                              {transaction.description}
                            </TableCell>
                            <TableCell>
                              {transaction.category ? (
                                <Badge variant="secondary">
                                  {transaction.category}
                                </Badge>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-400">
                              {getAccountName(transaction.accountId)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  transaction.source === 'gmail'
                                    ? 'info'
                                    : 'default'
                                }
                              >
                                {transaction.source === 'gmail'
                                  ? 'Gmail'
                                  : 'Manual'}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className={`text-right font-mono font-medium ${isExpense(transaction.amount) ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                            >
                              {formatMoney(transaction.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <CreateTransactionForm accounts={accounts} />
        </div>
      </div>
    </div>
  );
}
