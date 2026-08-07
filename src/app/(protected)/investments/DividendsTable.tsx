'use client';

import { DollarSign } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
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
  totalElements?: number;
  onSuccess?: () => void;
}

export function DividendsTable({
  dividends,
  accounts,
  brokerAccounts,
  totalElements,
  onSuccess,
}: DividendsTableProps) {
  const getAccountName = (accountId: string | undefined, fallbackName?: string) => {
    if (fallbackName) return fallbackName;
    if (!accountId) return '—';
    const acc = accounts.find((a) => a.id === accountId) || brokerAccounts.find((a) => a.id === accountId);
    return acc?.name || 'Broker';
  };

  const getTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'dividend':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[9px] px-1 py-0">
            Dividend
          </Badge>
        );
      case 'interest':
        return (
          <Badge variant="outline" className="bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800 text-[9px] px-1 py-0">
            Interest
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[9px] px-1 py-0">
            {type}
          </Badge>
        );
    }
  };

  const getSourceBadge = (source?: string) => {
    if (!source || source === 'manual') return null;
    if (source === 'suggested') {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[9px] px-1 py-0" title="Auto-detected from Yahoo">
          Auto
        </Badge>
      );
    }
    if (source === 'import') {
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[9px] px-1 py-0" title="Imported from CAS statement">
          CAS
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[9px] px-1 py-0">
        {source}
      </Badge>
    );
  };

  const countDisplay = totalElements !== undefined ? totalElements : dividends.length;

  return (
    <>
      {/* Mobile View: Card-based Layout (No horizontal scrolling) */}
      <div className="block md:hidden space-y-2">
        <div className="flex items-center justify-between px-1 pb-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Income & Dividends ({countDisplay})
          </span>
        </div>

        {dividends.length === 0 ? (
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-6 text-center text-xs text-slate-500">
            No dividends recorded yet.
          </Card>
        ) : (
          dividends.map((div) => {
            const gross = Number(div.amount || 0);
            const tdsVal = div.tds ? Number(div.tds) : 0;
            const net = gross - tdsVal;

            return (
              <Card
                key={div.id}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 shadow-sm rounded-xl p-2.5"
              >
                {/* Header Row: Symbol/Name + Badges Left | Edit Right */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {div.symbol || div.instrumentName}
                      </span>
                      {getTypeBadge(div.type)}
                      {getSourceBadge(div.source)}
                    </div>
                    {div.instrumentName && div.symbol && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {div.instrumentName}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <EditDividendDialog dividend={div} onSuccess={onSuccess} />
                  </div>
                </div>

                {/* Details Grid: Broker, Pay Date, Ex Date, Per Unit */}
                <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Broker</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {getAccountName(div.brokerAccountId, div.brokerName)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Payment Date</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                      {formatDate(div.payDate)}
                    </span>
                  </div>
                  {div.exDate && (
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Ex-Date</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                        {formatDate(div.exDate)}
                      </span>
                    </div>
                  )}
                  {div.perUnit && (
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Per Unit</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                        {formatMoney(div.perUnit)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Amount Breakdown Footer */}
                <div className="flex items-center justify-between text-xs">
                  {/*<div className="flex items-center gap-3 text-[11px]">*/}
                    <div className="text-left">
                      <span className="text-slate-400 block">Gross: </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                        {formatMoney(div.amount)}
                      </span>
                    </div>
                    {div.tds && (
                    <div className="text-center">
                        <span className="text-slate-400 block">TDS: </span>
                        <span className="font-medium text-rose-600 dark:text-rose-400 tabular-nums">
                          {formatMoney(div.tds)}
                        </span>
                      </div>
                    )}
                  {/*</div>*/}
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Net Received</span>
                    <span className="font-black text-base text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatMoney(net)}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Desktop View: Full Table Layout */}
      <Card className="hidden md:block bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Income & Dividends ({countDisplay})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {dividends.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">No dividends recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                    <TableHead className="text-xs font-medium">Instrument</TableHead>
                    <TableHead className="text-xs font-medium">Account</TableHead>
                    <TableHead className="text-xs font-medium">Type/Source</TableHead>
                    <TableHead className="text-xs font-medium whitespace-nowrap">Ex-Date</TableHead>
                    <TableHead className="text-xs font-medium whitespace-nowrap">Pay Date</TableHead>
                    <TableHead className="text-right text-xs font-medium whitespace-nowrap">Per Unit</TableHead>
                    <TableHead className="text-right text-xs font-medium whitespace-nowrap">Gross</TableHead>
                    <TableHead className="text-right text-xs font-medium whitespace-nowrap">TDS</TableHead>
                    <TableHead className="text-right text-xs font-medium whitespace-nowrap">Net</TableHead>
                    <TableHead className="text-right text-xs font-medium"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dividends.map((div) => {
                    const gross = Number(div.amount || 0);
                    const tdsVal = div.tds ? Number(div.tds) : 0;
                    const net = gross - tdsVal;

                    return (
                      <TableRow key={div.id} className="border-slate-100 dark:border-slate-800/60">
                        <TableCell className="py-1.5">
                          <div className="font-medium text-xs text-slate-900 dark:text-slate-100">
                            {div.symbol || div.instrumentName}
                          </div>
                          {div.instrumentName && div.symbol && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{div.instrumentName}</div>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-400">
                          {getAccountName(div.brokerAccountId, div.brokerName)}
                        </TableCell>
                        <TableCell className="py-2.5 text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {getTypeBadge(div.type)}
                            {getSourceBadge(div.source)}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap">
                          {div.exDate ? formatDate(div.exDate) : '—'}
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap">
                          {formatDate(div.payDate)}
                        </TableCell>
                        <TableCell className="py-2.5 text-right text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                          {div.perUnit ? formatMoney(div.perUnit) : '—'}
                        </TableCell>
                        <TableCell className="py-2.5 text-right font-medium text-xs text-slate-900 dark:text-slate-100 tabular-nums">
                          {formatMoney(div.amount)}
                        </TableCell>
                        <TableCell className="py-2.5 text-right text-xs text-rose-600 dark:text-rose-400 tabular-nums font-medium">
                          {div.tds ? formatMoney(div.tds) : '—'}
                        </TableCell>
                        <TableCell className="py-2.5 text-right font-medium text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatMoney(net)}
                        </TableCell>
                        <TableCell className="py-2.5 text-right">
                          <EditDividendDialog dividend={div} onSuccess={onSuccess} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
