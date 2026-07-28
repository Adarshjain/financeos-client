'use client';

import { DollarSign } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Account, Broker } from '@/lib/account.types';
import { Dividend } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

import { EditDividendDialog } from './EditDividendDialog';

interface DividendsTableProps {
  dividends: Dividend[];
  accounts: Account[];
  brokerAccounts: Broker[];
}

export function DividendsTable({ dividends, accounts, brokerAccounts }: DividendsTableProps) {
  const getAccountName = (accountId: string | undefined, fallbackName?: string) => {
    if (fallbackName) return fallbackName;
    if (!accountId) return '—';
    const acc = accounts.find((a) => a.id === accountId) || brokerAccounts.find((a) => a.id === accountId);
    return acc?.name || 'Broker';
  };

  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Income & Dividends ({dividends.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {dividends.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500">No dividends recorded yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                <TableHead className="text-xs font-semibold">Instrument / Symbol</TableHead>
                <TableHead className="text-xs font-semibold">Broker Account</TableHead>
                <TableHead className="text-xs font-semibold">Date</TableHead>
                <TableHead className="text-right text-xs font-semibold">Amount</TableHead>
                <TableHead className="text-right text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dividends.map((div) => (
                <TableRow key={div.id} className="border-slate-100 dark:border-slate-800/60">
                  <TableCell className="py-2.5">
                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100">{div.symbol}</div>
                  </TableCell>
                  <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-400">
                    {getAccountName(div.brokerAccountId)}
                  </TableCell>
                  <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                    {formatDate(div.exDate || div.payDate)}
                  </TableCell>
                  <TableCell className="py-2.5 text-right font-black text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatMoney(div.amount)}
                  </TableCell>
                  <TableCell className="py-2.5 text-right">
                    <EditDividendDialog dividend={div} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
