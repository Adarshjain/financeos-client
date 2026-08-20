'use client';

import {Loader2} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';

import {getDividendSummary, listDividends} from '@/actions/investments';
import {PageActionBar} from '@/components/layout/PageActionBarContext';
import {TablePagination} from '@/components/reports/views/TablePagination';
import {Card, CardContent} from '@/components/ui/card';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Account, Broker} from '@/lib/account.types';
import {Dividend, DividendSummary, DividendType, PagedDividendResponse, Position} from '@/lib/types';
import {cn, formatMoney} from '@/lib/utils';

import {CreateDividendDialog} from './CreateDividendDialog';
import {DetectDividendsButton} from './DetectDividendsButton';
import {DividendsTable} from './DividendsTable';

interface DividendsSectionProps {
  initialData: PagedDividendResponse;
  initialSummary: DividendSummary;
  brokerAccounts: Broker[];
  accounts: Account[];
  positions: Position[];
}

export function DividendsSection({
                                   initialData,
                                   initialSummary,
                                   brokerAccounts,
                                   accounts,
                                   positions,
                                 }: DividendsSectionProps) {
  const [selectedBrokerFilter, setSelectedBrokerFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedFyFilter, setSelectedFyFilter] = useState<string>('all');

  const [page, setPage] = useState<number>(initialData.number || 0);
  const [pageSize, setPageSize] = useState<number>(initialData.size || 25);

  const [dividends, setDividends] = useState<Dividend[]>(initialData.content || []);
  const [totalElements, setTotalElements] = useState<number>(initialData.totalElements || 0);
  const [totalPages, setTotalPages] = useState<number>(initialData.totalPages || 1);

  const [summary, setSummary] = useState<DividendSummary>(initialSummary);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const currentPage = Math.min(page, Math.max(0, totalPages - 1));

  // Determine active date range based on selected FY
  const activeBucket = summary.buckets.find((b) => b.label === selectedFyFilter);
  const fromDate = activeBucket ? activeBucket.fromDate : undefined;
  const toDate = activeBucket ? activeBucket.toDate : undefined;

  const fetchPage = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listDividends(page, pageSize, {
        ...(selectedBrokerFilter === 'all' ? {} : {brokerAccountId: selectedBrokerFilter}),
        ...(selectedTypeFilter === 'all' ? {} : {type: selectedTypeFilter as DividendType}),
        ...(fromDate ? {from: fromDate} : {}),
        ...(toDate ? {to: toDate} : {}),
      });
      if (res.success) {
        setDividends(res.data.content || []);
        setTotalElements(res.data.totalElements || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, selectedBrokerFilter, selectedTypeFilter, fromDate, toDate]);

  const fetchSummaryData = useCallback(async () => {
    const res = await getDividendSummary({
      ...(selectedBrokerFilter === 'all' ? {} : {brokerAccountId: selectedBrokerFilter}),
      ...(selectedTypeFilter === 'all' ? {} : {type: selectedTypeFilter as DividendType}),
    });
    if (res.success) {
      setSummary(res.data);
    }
  }, [selectedBrokerFilter, selectedTypeFilter]);

  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    fetchPage();
  }, [fetchPage]);

  const isFirstSummaryRun = useRef(true);
  useEffect(() => {
    if (isFirstSummaryRun.current) {
      isFirstSummaryRun.current = false;
      return;
    }
    fetchSummaryData();
  }, [fetchSummaryData]);

  const refreshAll = useCallback(() => {
    fetchPage();
    fetchSummaryData();
  }, [fetchPage, fetchSummaryData]);

  const handleBrokerChange = (val: string) => {
    setSelectedBrokerFilter(val);
    setPage(0);
  };

  const handleTypeChange = (val: string) => {
    setSelectedTypeFilter(val);
    setPage(0);
  };

  const handleFyChange = (val: string) => {
    setSelectedFyFilter(val);
    setPage(0);
  };

  // Compute displayed summary strip values based on FY filter selection
  const displayGross = activeBucket ? activeBucket.amount : summary.totalAmount;
  const displayTds = activeBucket ? activeBucket.tds : summary.totalTds;
  const displayNet = activeBucket ? activeBucket.net : summary.totalNet;
  const displayCount = activeBucket ? activeBucket.count : summary.totalCount;

  const renderActionBar = (isMobile = false) => (
      <div className={cn('flex items-center gap-2 w-full', isMobile ? 'flex-col sm:flex-row text-xs' : 'sm:flex-row flex-wrap')}>
        <div className={cn("flex flex-row gap-2 flex-wrap items-center", isMobile ? 'w-full' : '')}>
          {/* Fiscal Year Filter */}
          <Select value={selectedFyFilter} onValueChange={handleFyChange}>
            <SelectTrigger
                className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold flex-1">
              <SelectValue placeholder="All Fiscal Years"/>
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
              <SelectItem value="all" className="text-xs font-medium">
                All FYs
              </SelectItem>
              {summary.buckets.map((b) => (
                  <SelectItem key={b.label} value={b.label} className="text-xs font-medium">
                    {b.label}
                  </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Broker Filter */}
          <Select value={selectedBrokerFilter} onValueChange={handleBrokerChange}>
            <SelectTrigger
                className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold flex-1">
              <SelectValue placeholder="All Brokers"/>
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

          {/* Type Filter */}
          <Select value={selectedTypeFilter} onValueChange={handleTypeChange}>
            <SelectTrigger
                className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold flex-1">
              <SelectValue placeholder="All Types"/>
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
              <SelectItem value="all" className="text-xs font-medium">
                All Types
              </SelectItem>
              <SelectItem value="dividend" className="text-xs font-medium">
                Dividend
              </SelectItem>
              <SelectItem value="interest" className="text-xs font-medium">
                Interest
              </SelectItem>
              <SelectItem value="other" className="text-xs font-medium">
                Other
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Pagination Controls */}
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
            unit="dividend"
            className="flex flex-row ml-auto"
        />
      </div>
  );

  return (
      <div className="space-y-3">
        {/* Page Header + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Dividend Income & Payouts
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Recorded cash dividends, bank payouts, and yield distribution log
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DetectDividendsButton onSuccess={refreshAll}/>
            <CreateDividendDialog brokerAccounts={brokerAccounts} positions={positions} onSuccess={refreshAll}/>
          </div>
        </div>

        {/* FY Combined Summary Card */}
        <Card
            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-2.5 sm:p-3">
          <CardContent className="p-0 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
            <div>
              <p className="text-2xs font-medium text-slate-500 dark:text-slate-400">Gross Income</p>
              <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 tabular-nums">
                {formatMoney(displayGross || 0)}
              </p>
            </div>

            <div>
              <p className="text-2xs font-medium text-slate-500 dark:text-slate-400">TDS Deducted</p>
              <p className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400 tabular-nums">
                {formatMoney(displayTds || 0)}
              </p>
            </div>

            <div>
              <p className="text-2xs font-medium text-slate-500 dark:text-slate-400">Net Received</p>
              <p className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatMoney(displayNet || 0)}
              </p>
            </div>

            <div>
              <p className="text-2xs font-medium text-slate-500 dark:text-slate-400">Payout Events</p>
              <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 tabular-nums">
                {displayCount}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Desktop Filter / Action Bar */}
        <Card
            className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-3">
          {renderActionBar(false)}
        </Card>

        {/* Mobile PageActionBar Integration */}
        <PageActionBar>
          {renderActionBar(true)}
        </PageActionBar>

        {/* Main Table Display */}
        <div className="relative">
          {isLoading && (
              <div
                  className="absolute right-3 top-3 z-10 text-slate-400 bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-full shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400"/>
              </div>
          )}

          <div className={cn(isLoading && 'opacity-60 transition-opacity')}>
            <DividendsTable
                dividends={dividends}
                accounts={accounts}
                brokerAccounts={brokerAccounts}
                totalElements={totalElements}
                onSuccess={refreshAll}
            />
          </div>
        </div>
      </div>
  );
}
