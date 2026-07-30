'use client';

import { History } from 'lucide-react';
import { useMemo, useState } from 'react';

import { TablePagination } from '@/components/reports/views/TablePagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [selectedBrokerFilter, setSelectedBrokerFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);

  const getBrokerName = (tx: InvestmentTransactionResponse) => {
    const acc = accounts.find((a) => a.id === tx.brokerAccountId) || brokerAccounts.find((a) => a.id === tx.brokerAccountId);
    return acc?.name || tx.brokerName || '—';
  };

  const getInstrumentDisplayName = (tx: InvestmentTransactionResponse) => {
    const name = tx.instrument.name;
    const symbol = tx.instrument.symbol;
    if (name && symbol) return `${name} (${symbol})`;
    return name || symbol || 'Instrument';
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

  const filteredTransactions = useMemo(() => {
    if (selectedBrokerFilter === 'all') return investmentTransactions;
    return investmentTransactions.filter((tx) => tx.brokerAccountId === selectedBrokerFilter);
  }, [investmentTransactions, selectedBrokerFilter]);

  const totalElements = filteredTransactions.length;
  const totalPages = Math.ceil(totalElements / pageSize) || 1;
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));

  const pagedTransactions = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const handleBrokerFilterChange = (val: string) => {
    setSelectedBrokerFilter(val);
    setPage(0);
  };

  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
      <CardHeader className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
        <div className="text-base font-bold flex sm:flex-row items-center justify-between gap-3">
            <span>Tradebook</span>

          <Select value={selectedBrokerFilter} onValueChange={handleBrokerFilterChange}>
            <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold w-[150px]">
              <SelectValue placeholder="All Brokers" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
              <SelectItem value="all" className="text-xs font-medium">
                All Brokers
              </SelectItem>
              {brokerAccounts.map((b) => (
                <SelectItem key={b.id} value={b.id} className="text-xs font-medium">
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500">
            {investmentTransactions.length === 0 ? 'No trades recorded yet.' : 'No trades found for selected broker.'}
          </div>
        ) : (
          <>
            {/* Mobile View: Clean Card List */}
            <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
              {pagedTransactions.map((tx) => (
                <div key={tx.id} className="p-3.5 space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-500">{formatDate(tx.tradeDate)}</span>
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
                  {pagedTransactions.map((tx) => (
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

            {/* Pagination Footer */}
            <div className="p-3.5 border-t border-slate-100 dark:border-slate-800">
              <TablePagination
                page={{
                  number: currentPage,
                  size: pageSize,
                  totalElements,
                  totalPages,
                }}
                onPageChange={(newPage) => setPage(newPage)}
                onSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setPage(0);
                }}
                unit="trade"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
