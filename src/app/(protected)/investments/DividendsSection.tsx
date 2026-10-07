'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Loader2, ScanSearch } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { TablePagination } from '@/components/reports/views/TablePagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isAccountOfType } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { usePositions } from '@/lib/query/hooks/useInvestments';
import { keys } from '@/lib/query/keys';
import {
  AccountType,
  DividendReceiptStatus,
  DividendReceiptSummary,
  DividendSummary,
  DividendType,
  PagedDividendResponse,
} from '@/lib/types';
import { cn } from '@/lib/utils';

import { CreateDividendDialog } from './CreateDividendDialog';
import { DetectDividendsButton } from './DetectDividendsButton';
import { DividendFilterSelects } from './dividend-receipts/DividendFilterSelects';
import { DividendFySummaryCard } from './dividend-receipts/DividendFySummaryCard';
import { DividendReconcilePanel } from './dividend-receipts/DividendReconcilePanel';
import { InstrumentFilterChip } from './dividend-receipts/InstrumentFilterChip';
import { ReceiptFilterSelect } from './dividend-receipts/ReceiptFilterSelect';
import { ReceiptSummaryCard } from './dividend-receipts/ReceiptSummaryCard';
import { useReceiptSummary } from './dividend-receipts/useReceiptSummary';
import { DividendsTable } from './DividendsTable';

const EMPTY_FY_SUMMARY: DividendSummary = { buckets: [], totalAmount: 0, totalTds: 0, totalNet: 0, totalCount: 0 };

interface DividendsSectionProps {
  initialData: PagedDividendResponse;
  initialSummary: DividendSummary;
  initialReceiptSummary?: DividendReceiptSummary;
}

export function DividendsSection({
  initialData,
  initialSummary,
  initialReceiptSummary,
}: DividendsSectionProps) {
  const router = useRouter();
  const instrumentId = useSearchParams().get('instrumentId') || undefined;
  const { data: accounts = [] } = useAccounts();
  const { data: positions = [] } = usePositions();
  const brokerAccounts = accounts.filter(isAccountOfType(AccountType.BROKER));
  const [selectedBrokerFilter, setSelectedBrokerFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedFyFilter, setSelectedFyFilter] = useState<string>('all');
  const [selectedReceiptFilter, setSelectedReceiptFilter] = useState<string>('all');
  const [showReconcile, setShowReconcile] = useState(false);

  const [page, setPage] = useState<number>(initialData.number || 0);
  const [pageSize, setPageSize] = useState<number>(initialData.size || 25);

  const isDefaultListFilters =
    page === (initialData.number || 0) &&
    pageSize === (initialData.size || 25) &&
    selectedBrokerFilter === 'all' &&
    selectedTypeFilter === 'all' &&
    selectedReceiptFilter === 'all' &&
    !instrumentId;
  const isDefaultSummaryFilters =
    selectedBrokerFilter === 'all' && selectedTypeFilter === 'all' && !instrumentId;

  const summaryParams = {
    ...(selectedBrokerFilter === 'all' ? {} : { brokerAccountId: selectedBrokerFilter }),
    ...(selectedTypeFilter === 'all' ? {} : { type: selectedTypeFilter as DividendType }),
    ...(instrumentId ? { instrumentId } : {}),
  };

  // With an instrument deep link the SSR data is for the unfiltered list, so it
  // must never stand in for the filtered result while that loads.
  const { data: receiptSummary, refetch: refetchReceiptSummary } = useReceiptSummary(
    summaryParams,
    isDefaultSummaryFilters ? initialReceiptSummary : undefined,
  );

  const { data: summary = instrumentId ? EMPTY_FY_SUMMARY : initialSummary, refetch: refetchSummary } = useQuery({
    queryKey: keys.investments.dividendSummary(summaryParams),
    queryFn: async () =>
      (
        await api.GET('/api/v1/investments/dividends/summary', {
          params: { query: summaryParams },
        })
      ).data! as DividendSummary,
    initialData: isDefaultSummaryFilters ? initialSummary : undefined,
  });

  // Determine active date range based on selected FY; also drives the summary
  // strip values below.
  const activeBucket = summary.buckets.find((b) => b.label === selectedFyFilter);
  const fromDate = activeBucket ? activeBucket.fromDate : undefined;
  const toDate = activeBucket ? activeBucket.toDate : undefined;

  const queryParams = {
    page,
    size: pageSize,
    ...(selectedBrokerFilter === 'all' ? {} : { brokerAccountId: selectedBrokerFilter }),
    ...(selectedTypeFilter === 'all' ? {} : { type: selectedTypeFilter as DividendType }),
    ...(instrumentId ? { instrumentId } : {}),
    ...(selectedReceiptFilter === 'all' ? {} : { receipt: selectedReceiptFilter as DividendReceiptStatus }),
    ...(fromDate ? { from: fromDate } : {}),
    ...(toDate ? { to: toDate } : {}),
  };

  const {
    data: dividendsPage = instrumentId ? undefined : initialData,
    isFetching: isLoading,
    isPlaceholderData,
    refetch: refetchList,
  } = useQuery({
    queryKey: keys.investments.dividends(queryParams),
    queryFn: async () =>
      (
        await api.GET('/api/v1/investments/dividends', {
          params: { query: queryParams },
        })
      ).data! as PagedDividendResponse,
    initialData: isDefaultListFilters && !fromDate && !toDate ? initialData : undefined,
    placeholderData: keepPreviousData,
  });

  const dividends = dividendsPage?.content || [];
  const totalElements = dividendsPage?.totalElements || 0;
  const totalPages = dividendsPage?.totalPages || 1;
  const chipRow = dividendsPage && !isPlaceholderData ? dividends[0] : undefined;
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));

  const refreshAll = () => {
    refetchList();
    refetchSummary();
    refetchReceiptSummary();
  };

  const handleBrokerChange = (val: string) => {
    setSelectedBrokerFilter(val);
    setPage(0);
  };

  const handleTypeChange = (val: string) => {
    setSelectedTypeFilter(val);
    setPage(0);
  };

  const handleReceiptChange = (val: string) => {
    setSelectedReceiptFilter(val);
    setPage(0);
  };

  const clearInstrument = () => {
    setPage(0);
    router.replace('/investments/dividends');
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
    <div
      className={cn(
        'flex items-center gap-2 w-full',
        isMobile ? 'flex-col sm:flex-row text-xs' : 'sm:flex-row flex-wrap'
      )}
    >
      <div className={cn('flex flex-row gap-2 flex-wrap items-center', isMobile ? 'w-full' : '')}>
        <DividendFilterSelects
          fyBuckets={summary.buckets.map((b) => b.label)}
          brokerAccounts={brokerAccounts}
          fy={selectedFyFilter}
          broker={selectedBrokerFilter}
          type={selectedTypeFilter}
          onFyChange={handleFyChange}
          onBrokerChange={handleBrokerChange}
          onTypeChange={handleTypeChange}
        />

        {/* Receipt Filter */}
        <ReceiptFilterSelect value={selectedReceiptFilter} onChange={handleReceiptChange} />
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
          {instrumentId && (
            <div className="pt-1">
              <InstrumentFilterChip
                label={chipRow?.symbol || chipRow?.instrumentName}
                onClear={clearInstrument}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowReconcile((v) => !v)}>
            <ScanSearch className="h-3.5 w-3.5" />
            Reconcile
          </Button>
          <DetectDividendsButton onSuccess={refreshAll} />
          <CreateDividendDialog brokerAccounts={brokerAccounts} positions={positions} onSuccess={refreshAll} />
        </div>
      </div>

      <DividendFySummaryCard
        gross={displayGross}
        tds={displayTds}
        net={displayNet}
        count={displayCount}
      />

      {receiptSummary && <ReceiptSummaryCard summary={receiptSummary} />}

      {showReconcile && (
        <DividendReconcilePanel
          brokerAccountId={selectedBrokerFilter === 'all' ? undefined : selectedBrokerFilter}
          brokerAccounts={brokerAccounts}
          positions={positions}
          onChanged={refreshAll}
        />
      )}

      {/* Desktop Filter / Action Bar */}
      <Card className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-3">
        {renderActionBar(false)}
      </Card>

      {/* Mobile PageActionBar Integration */}
      <PageActionBar>{renderActionBar(true)}</PageActionBar>

      {/* Main Table Display */}
      <div className="relative">
        {isLoading && (
          <div className="absolute right-3 top-3 z-10 text-slate-400 bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-full shadow-sm">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
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
