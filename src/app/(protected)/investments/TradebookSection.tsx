'use client';

import { Loader2, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { listInvestmentTransactions } from '@/actions/investments';
import { TablePagination } from '@/components/reports/views/TablePagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Account, Broker } from '@/lib/account.types';
import { InvestmentTransactionResponse, PagedInvestmentTransactionResponse } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

import { EditTransactionDialog } from './EditTransactionDialog';

interface TradebookSectionProps {
  initialData: PagedInvestmentTransactionResponse;
  brokerAccounts: Broker[];
  accounts: Account[];
}

export function TradebookSection({ initialData, brokerAccounts, accounts }: TradebookSectionProps) {
  const [selectedBrokerFilter, setSelectedBrokerFilter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(initialData.number || 0);
  const [pageSize, setPageSize] = useState<number>(initialData.size || 10);

  const [transactions, setTransactions] = useState<InvestmentTransactionResponse[]>(initialData.content || []);
  const [totalElements, setTotalElements] = useState<number>(initialData.totalElements || 0);
  const [totalPages, setTotalPages] = useState<number>(initialData.totalPages || 1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Clamp for display only; the pagination UI never offers an out-of-range page,
  // so `page` is what we actually request.
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));

  // Debounce the search box so we don't hit the server on every keystroke.
  // Resetting to page 0 keeps the user from landing on an out-of-range page
  // once the (usually smaller) filtered result set comes back.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchPage = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listInvestmentTransactions(page, pageSize, {
        ...(selectedBrokerFilter === 'all' ? {} : { brokerAccountId: selectedBrokerFilter }),
        ...(search ? { search } : {}),
      });
      if (res.success) {
        setTransactions(res.data.content || []);
        setTotalElements(res.data.totalElements || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, selectedBrokerFilter, search]);

  // Skip the first run: the initial page/size/filter is already served by
  // `initialData` (SSR). Refetch on any user change to page, size, broker
  // filter, or search, and whenever the server revalidates (new `initialData`).
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    fetchPage();
  }, [fetchPage, initialData]);

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

  const isEmpty = totalElements === 0;

  const handleBrokerFilterChange = (val: string) => {
    setSelectedBrokerFilter(val);
    setPage(0);
  };

  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
      <CardHeader className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
        <div className="text-base font-bold flex flex-wrap items-center justify-between gap-3">
            <span>Tradebook</span>

          <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by ticker or name..."
              className="h-8 w-[190px] pl-8 pr-7 text-xs font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg"
            />
            {searchInput && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

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
        </div>
      </CardHeader>
      <CardContent className="p-0 relative">
        {isLoading && (
          <div className="absolute right-3 top-3 z-10 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}
        {isEmpty && !isLoading ? (
          <div className="text-center py-10 text-xs text-slate-500">
            {search
              ? 'No trades match your search.'
              : selectedBrokerFilter === 'all'
                ? 'No trades recorded yet.'
                : 'No trades found for selected broker.'}
          </div>
        ) : (
          <div className={isLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            {/* Mobile View: Clean Card List */}
            <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-3.5 space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-500">{formatDate(tx.tradeDate)}</span>
                    <div className="flex items-center gap-1.5">
                      {getTypeBadge(tx.type)}
                      <EditTransactionDialog transaction={tx} brokerAccounts={brokerAccounts} onSuccess={fetchPage} />
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
                  {transactions.map((tx) => (
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
                        <EditTransactionDialog transaction={tx} brokerAccounts={brokerAccounts} onSuccess={fetchPage} />
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
