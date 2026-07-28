'use client';

import { History } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Account, Broker } from '@/lib/account.types';
import { InvestmentTransactionResponse } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

import { EditTransactionDialog } from './EditTransactionDialog';

interface TradebookSectionProps {
  investmentTransactions: InvestmentTransactionResponse[];
  brokerAccounts: Broker[];
  accounts: Account[];
}

export function TradebookSection({ investmentTransactions, brokerAccounts, accounts }: TradebookSectionProps) {
  const getBrokerName = (tx: InvestmentTransactionResponse) => {
    const t = tx as any;
    const id = tx.brokerAccountId || t.broker?.id || t.brokerAccount?.id || t.accountId;
    if (id) {
      const acc = accounts.find((a) => a.id === id) || brokerAccounts.find((a) => a.id === id);
      if (acc?.name) return acc.name;
    }
    return t.broker?.name || t.brokerName || t.brokerAccountName || '—';
  };

  const getInstrumentDisplayName = (tx: InvestmentTransactionResponse) => {
    const t = tx as any;
    const name = tx.instrument?.name || t.instrumentName;
    const symbol = tx.instrument?.symbol || t.symbol || t.instrumentSymbol;
    if (name && symbol) return `${name} (${symbol})`;
    if (name) return name;
    if (symbol) return symbol;
    return 'Instrument';
  };

  const getTypeBadge = (type: string | undefined) => {
    switch (type?.toLowerCase()) {
      case 'buy':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border-0 text-[10px]">
            BUY
          </Badge>
        );
      case 'sell':
        return (
          <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold border-0 text-[10px]">
            SELL
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-bold text-[10px]">
            {type?.toUpperCase() || 'TRADE'}
          </Badge>
        );
    }
  };

  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="text-base font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Tradebook ({investmentTransactions.length})</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {investmentTransactions.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500">No trades recorded yet.</div>
        ) : (
          <>
            {/* Mobile View: Clean Card List */}
            <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
              {investmentTransactions.map((tx) => (
                <div key={tx.id} className="px-3 py-1.5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-mono">{formatDate(tx.tradeDate)}</span>
                    <div className="flex items-center gap-1.5">
                      {getTypeBadge(tx.type)}
                      <EditTransactionDialog transaction={tx} brokerAccounts={brokerAccounts} />
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {getInstrumentDisplayName(tx)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        {getBrokerName(tx)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100 tabular-nums">
                        {formatMoney(tx.price)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums font-semibold">
                        Qty: {tx.quantity}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                    <TableHead className="text-xs font-semibold whitespace-nowrap">Date</TableHead>
                    <TableHead className="text-xs font-semibold whitespace-nowrap">Broker</TableHead>
                    <TableHead className="text-xs font-semibold whitespace-nowrap">Type</TableHead>
                    <TableHead className="text-xs font-semibold whitespace-nowrap">Instrument</TableHead>
                    <TableHead className="text-right text-xs font-semibold whitespace-nowrap">Qty</TableHead>
                    <TableHead className="text-right text-xs font-semibold whitespace-nowrap">Price</TableHead>
                    <TableHead className="text-right text-xs font-semibold whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investmentTransactions.map((tx) => (
                    <TableRow key={tx.id} className="border-slate-100 dark:border-slate-800/60">
                      <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap">
                        {formatDate(tx.tradeDate)}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                        {getBrokerName(tx)}
                      </TableCell>
                      <TableCell className="py-2.5">{getTypeBadge(tx.type)}</TableCell>
                      <TableCell className="py-2.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                        {getInstrumentDisplayName(tx)}
                      </TableCell>
                      <TableCell className="py-2.5 text-right font-semibold text-xs tabular-nums">
                        {tx.quantity}
                      </TableCell>
                      <TableCell className="py-2.5 text-right font-bold text-xs tabular-nums">
                        {formatMoney(tx.price)}
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        <EditTransactionDialog transaction={tx} brokerAccounts={brokerAccounts} />
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
  );
}
