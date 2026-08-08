'use client';

import { Layers, Loader2, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { listInvestmentTransactions } from '@/actions/investments';
import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { TablePagination } from '@/components/reports/views/TablePagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Account, Broker } from '@/lib/account.types';
import { InvestmentTransactionResponse, PagedInvestmentTransactionResponse } from '@/lib/types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

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
  const [pageSize, setPageSize] = useState<number>(initialData.size || 12);

  const [transactions, setTransactions] = useState<InvestmentTransactionResponse[]>(initialData.content || []);
  const [totalElements, setTotalElements] = useState<number>(initialData.totalElements || 0);
  const [totalPages, setTotalPages] = useState<number>(initialData.totalPages || 1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const currentPage = Math.min(page, Math.max(0, totalPages - 1));

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
          <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-bold text-[10px] uppercase px-2 py-0.5">
            BUY
          </Badge>
        );
      case 'sell':
        return (
          <Badge variant="outline" className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-bold text-[10px] uppercase px-2 py-0.5">
            SELL
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-bold text-[10px] uppercase px-2 py-0.5">
            {type?.toUpperCase() || 'TRADE'}
          </Badge>
        );
    }
  };

  const getSettlementBadge = (settlementType: string | undefined) => {
    if (settlementType?.toLowerCase() === 'intraday') {
      return (
        <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-bold text-[10px] uppercase px-1.5 py-0" title="Intraday (MIS)">
          MIS
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800 font-bold text-[10px] uppercase px-1.5 py-0" title="Delivery (CNC)">
        CNC
      </Badge>
    );
  };

  const handleBrokerFilterChange = (val: string) => {
    setSelectedBrokerFilter(val);
    setPage(0);
  };

  const renderActionBar = (isMobile = false) => (
    <div className={cn('flex items-center gap-2 w-full', isMobile ? 'flex-col sm:flex-row text-xs' : 'flex-wrap')}>
      {/* Search Input */}
      <div className="flex flex-row gap-2">
      <div className="relative flex-1 min-w-[180px] w-full">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by symbol or name..."
          className="h-8 pl-8 pr-7 text-xs font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg w-full"
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

      {/* Broker Select Filter */}
      <Select value={selectedBrokerFilter} onValueChange={handleBrokerFilterChange}>
        <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold w-[150px] shrink-0">
          <SelectValue placeholder="All Brokers" />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
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

      {/* Integrated Pagination Controls */}
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
        className="flex flex-row"
      />
    </div>
  );

  return (
    <div className="space-y-2 pb-32">
      {/* Desktop Action Bar Container */}
      <Card className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-3">
        {renderActionBar(false)}
      </Card>

      {/* Mobile PageActionBar Integration */}
      <PageActionBar>
        {renderActionBar(true)}
      </PageActionBar>

      {/* Main Tradebook Cards Display */}
      {totalElements === 0 && !isLoading ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-8 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No trades recorded</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {search
                ? 'No trades match your search criteria.'
                : selectedBrokerFilter === 'all'
                ? 'Record trades manually or import contract notes to track execution history.'
                : 'No trades found for the selected broker account.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="relative">
          {isLoading && (
            <div className="absolute right-3 top-3 z-10 text-slate-400 bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-full shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
            </div>
          )}

          {/* Mobile View: Card-based Layout */}
          <div className={cn('block md:hidden space-y-2', isLoading && 'opacity-60 transition-opacity')}>
            {transactions.map((tx) => (
              <Card
                key={tx.id}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-900/60 transition-all duration-200 overflow-hidden flex flex-col justify-between"
              >
                {/* Header Row: Date + Type + CNC/MIS Left | Edit Button Right */}
                <CardHeader className="p-3 sm:p-3.5 flex flex-row items-center justify-between border-0 space-y-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                      {formatDate(tx.tradeDate)}
                    </span>
                    {getTypeBadge(tx.type)}
                    {getSettlementBadge(tx.settlementType)}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <EditTransactionDialog transaction={tx} brokerAccounts={brokerAccounts} onSuccess={fetchPage} />
                  </div>
                </CardHeader>

                <CardContent className="p-3 sm:p-3.5 space-y-1 flex-1 flex flex-col justify-between pt-0">
                  {/* Instrument & Broker Info */}
                  <div className="space-y-1">
                    <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate" title={getInstrumentDisplayName(tx)}>
                      {getInstrumentDisplayName(tx)}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {getBrokerName(tx)}
                    </div>
                  </div>

                  {/* Qty & Price Footer */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Qty: <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">{tx.quantity}</span>
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 tabular-nums">
                        {formatMoney(tx.price)}
                      </span>
                      <span className="text-[10px] text-slate-400 tabular-nums ml-1">/ unit</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop View: Full Table Layout */}
          <Card className={cn('hidden md:block bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden', isLoading && 'opacity-60 transition-opacity')}>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                      <TableHead className="text-xs font-medium whitespace-nowrap">Trade Date</TableHead>
                      <TableHead className="text-xs font-medium">Instrument</TableHead>
                      <TableHead className="text-xs font-medium">Broker</TableHead>
                      <TableHead className="text-xs font-medium whitespace-nowrap">Type</TableHead>
                      <TableHead className="text-xs font-medium whitespace-nowrap">Type</TableHead>
                      <TableHead className="text-right text-xs font-medium whitespace-nowrap">Qty</TableHead>
                      <TableHead className="text-right text-xs font-medium whitespace-nowrap">Price/Unit</TableHead>
                      <TableHead className="text-right text-xs font-medium whitespace-nowrap">Total Value</TableHead>
                      <TableHead className="text-right text-xs font-medium"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => {
                      const totalValue = Number(tx.quantity || 0) * Number(tx.price || 0);

                      return (
                        <TableRow key={tx.id} className="border-slate-100 dark:border-slate-800/60">
                          <TableCell className="py-1.5 text-xs text-slate-600 dark:text-slate-400 tabular-nums font-medium whitespace-nowrap">
                            {formatDate(tx.tradeDate)}
                          </TableCell>
                          <TableCell className="py-1.5">
                            <div className="font-medium text-xs text-slate-900 dark:text-slate-100" title={getInstrumentDisplayName(tx)}>
                              {getInstrumentDisplayName(tx)}
                            </div>
                          </TableCell>
                          <TableCell className="py-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                            {getBrokerName(tx)}
                          </TableCell>
                          <TableCell className="py-1.5 text-xs">
                            {getTypeBadge(tx.type)}
                          </TableCell>
                          <TableCell className="py-1.5 text-xs">
                            {getSettlementBadge(tx.settlementType)}
                          </TableCell>
                          <TableCell className="py-1.5 text-right font-medium text-xs text-slate-900 dark:text-slate-100 tabular-nums">
                            {tx.quantity}
                          </TableCell>
                          <TableCell className="py-1.5 text-right text-xs text-slate-700 dark:text-slate-300 tabular-nums font-medium">
                            {formatMoney(tx.price)}
                          </TableCell>
                          <TableCell className="py-1.5 text-right font-medium text-xs text-slate-900 dark:text-slate-100 tabular-nums">
                            {formatMoney(totalValue)}
                          </TableCell>
                          <TableCell className="py-1.5 text-right">
                            <EditTransactionDialog transaction={tx} brokerAccounts={brokerAccounts} onSuccess={fetchPage} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
