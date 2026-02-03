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
import { accountsApi,investmentsApi } from '@/lib/apiClient';
import type {
  InvestmentTransactionResponse,
  Position,
} from '@/lib/types';
import { formatDate,formatMoney } from '@/lib/utils';

import { CreateInvestmentForm } from './CreateInvestmentForm';

export default async function InvestmentsPage() {
  const [investmentData, accounts, positionsData] = await Promise.all([
    investmentsApi.listTransactions(),
    accountsApi.list(),
    investmentsApi.getPositions(),
  ]);

  const investmentTransactions: InvestmentTransactionResponse[] =
    investmentData.content as InvestmentTransactionResponse[];
  const positions: Position[] = positionsData.positions || [];
  // Filter for stock and mutual_fund accounts only
  const investmentAccounts = accounts.filter(
    (a: any) => a.type === 'stock' || a.type === 'mutual_fund'
  );

  const getAccountName = (accountId: string | undefined) => {
    if (!accountId) return '—';
    const account = accounts.find((a: any) => a.id === accountId);
    return account?.name || 'Unknown';
  };

  const getTypeBadge = (type: string | undefined) => {
    switch (type) {
      case 'buy':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            Buy
          </Badge>
        );
      case 'sell':
        return <Badge variant="danger">Sell</Badge>;
      default:
        return <Badge variant="secondary">{type || 'Unknown'}</Badge>;
    }
  };

  const calculateTotal = (
    quantity: number | string | undefined,
    price: number | string | undefined
  ): number => {
    const qty =
      typeof quantity === 'string' ? parseFloat(quantity) : quantity || 0;
    const prc = typeof price === 'string' ? parseFloat(price) : price || 0;
    return qty * prc;
  };

  const parseNumber = (value: number | string | undefined): number => {
    if (value === undefined) return 0;
    return typeof value === 'string' ? parseFloat(value) : value;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Investments
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Track your portfolio and trades
        </p>
      </div>

      {/* Positions */}
      {positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Positions ({positions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile View */}
            <div className="lg:hidden">
              <DataList>
                {positions.map((position: Position, idx: number) => (
                  <DataListItem
                    key={`${position.accountId}-${position.instrumentCode}-${idx}`}
                  >
                    <DataListRow>
                      <DataListLabel>Symbol</DataListLabel>
                      <DataListValue className="font-bold text-emerald-600 dark:text-emerald-400">
                        {position.instrumentCode}
                      </DataListValue>
                    </DataListRow>
                    <DataListRow>
                      <DataListLabel>Account</DataListLabel>
                      <DataListValue className="text-slate-600 dark:text-slate-400">
                        {position.accountName ||
                          getAccountName(position.accountId)}
                      </DataListValue>
                    </DataListRow>
                    <DataListRow>
                      <DataListLabel>Quantity</DataListLabel>
                      <DataListValue className="font-mono">
                        {position.quantity}
                      </DataListValue>
                    </DataListRow>
                    <DataListRow>
                      <DataListLabel>Avg Cost</DataListLabel>
                      <DataListValue className="font-mono">
                        {formatMoney(position.averageCost)}
                      </DataListValue>
                    </DataListRow>
                    <DataListRow>
                      <DataListLabel>Current Value</DataListLabel>
                      <DataListValue className="font-mono font-medium">
                        {formatMoney(position.currentValue)}
                      </DataListValue>
                    </DataListRow>
                    <DataListRow>
                      <DataListLabel>Gain/Loss</DataListLabel>
                      <DataListValue
                        className={`font-mono font-medium ${parseNumber(position.unrealizedGainLoss) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                      >
                        {parseNumber(position.unrealizedGainLoss) >= 0
                          ? '+'
                          : ''}
                        {formatMoney(position.unrealizedGainLoss)} (
                        {position.unrealizedGainLossPercent}%)
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
                    <TableHead>Symbol</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Avg Cost</TableHead>
                    <TableHead className="text-right">Current Value</TableHead>
                    <TableHead className="text-right">Gain/Loss</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((position: Position, idx: number) => (
                    <TableRow
                      key={`${position.accountId}-${position.instrumentCode}-${idx}`}
                    >
                      <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">
                        {position.instrumentCode}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">
                        {position.accountName ||
                          getAccountName(position.accountId)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-slate-900 dark:text-slate-100">
                        {position.quantity}
                      </TableCell>
                      <TableCell className="text-right font-mono text-slate-900 dark:text-slate-100">
                        {formatMoney(position.averageCost)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-slate-900 dark:text-slate-100">
                        {formatMoney(position.currentValue)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono font-medium ${parseNumber(position.unrealizedGainLoss) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                      >
                        {parseNumber(position.unrealizedGainLoss) >= 0
                          ? '+'
                          : ''}
                        {formatMoney(position.unrealizedGainLoss)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                Trade History ({investmentTransactions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {investmentTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-600 dark:text-slate-400 mb-2">
                    No trades yet
                  </p>
                  <p className="text-sm text-slate-500">
                    Record your first trade to start tracking!
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile View */}
                  <div className="lg:hidden">
                    <DataList>
                      {investmentTransactions.map((tx) => (
                        <DataListItem key={tx.id}>
                          <DataListRow>
                            <DataListLabel>Account</DataListLabel>
                            <DataListValue className="font-medium">
                              {getAccountName(tx.accountId)}
                            </DataListValue>
                          </DataListRow>
                          <DataListRow>
                            <DataListLabel>Type</DataListLabel>
                            <DataListValue>
                              {getTypeBadge(tx.type)}
                            </DataListValue>
                          </DataListRow>
                          <DataListRow>
                            <DataListLabel>Qty × Price</DataListLabel>
                            <DataListValue className="font-mono">
                              {tx.quantity} × {formatMoney(tx.price)}
                            </DataListValue>
                          </DataListRow>
                          <DataListRow>
                            <DataListLabel>Total</DataListLabel>
                            <DataListValue className="font-mono font-medium">
                              {formatMoney(
                                calculateTotal(tx.quantity, tx.price)
                              )}
                            </DataListValue>
                          </DataListRow>
                          <DataListRow>
                            <DataListLabel>Date</DataListLabel>
                            <DataListValue className="text-slate-600 dark:text-slate-400">
                              {formatDate(tx.date)}
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
                          <TableHead>Account</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {investmentTransactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-slate-600 dark:text-slate-400">
                              {formatDate(tx.date)}
                            </TableCell>
                            <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                              {getAccountName(tx.accountId)}
                            </TableCell>
                            <TableCell>{getTypeBadge(tx.type)}</TableCell>
                            <TableCell className="text-right font-mono text-slate-900 dark:text-slate-100">
                              {tx.quantity}
                            </TableCell>
                            <TableCell className="text-right font-mono text-slate-900 dark:text-slate-100">
                              {formatMoney(tx.price)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium text-slate-900 dark:text-slate-100">
                              {formatMoney(
                                calculateTotal(tx.quantity, tx.price)
                              )}
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
          <CreateInvestmentForm accounts={investmentAccounts} />
        </div>
      </div>
    </div>
  );
}
