'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Broker } from '@/lib/account.types';
import { api, ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { FnoTradeListResponse, FnoTradeResponse } from '@/lib/types';

import { FnoMetrics } from './FnoSummaryCards';

interface UseFnoViewProps {
  brokerAccounts: Broker[];
}

export function useFnoView({ brokerAccounts }: UseFnoViewProps) {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: keys.investments.fno(),
    queryFn: async () =>
      (await api.GET('/api/v1/investments/fno')).data! as FnoTradeListResponse,
  });
  const trades = useMemo(() => data?.trades ?? [], [data]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.DELETE('/api/v1/investments/fno/{id}', { params: { path: { id } } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.investments.all }),
  });

  // Filter States
  const [search, setSearch] = useState('');
  const [contractTypeFilter, setContractTypeFilter] = useState<string>('all');
  const [optionTypeFilter, setOptionTypeFilter] = useState<string>('all');
  const [brokerFilter, setBrokerFilter] = useState<string>('all');

  // Sorting State
  const [sortField, setSortField] = useState<
    'exitDate' | 'tradingSymbol' | 'realizedPnl' | 'buyValue'
  >('exitDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Delete Confirmation Modal
  const [deletingTrade, setDeletingTrade] = useState<FnoTradeResponse | null>(
    null
  );
  const isDeleting = deleteMutation.isPending;

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: keys.investments.all });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTrade) return;
    try {
      await deleteMutation.mutateAsync(deletingTrade.id);
      toast.success(`Deleted trade for ${deletingTrade.tradingSymbol}`);
      setDeletingTrade(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.response.message
          : 'Failed to delete trade'
      );
    }
  };

  // Filter & Sort Logic
  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const symbolMatch = trade.tradingSymbol?.toLowerCase().includes(q);
        const underlyingMatch = trade.underlyingSymbol
          ?.toLowerCase()
          .includes(q);
        const notesMatch = trade.notes?.toLowerCase().includes(q);
        if (!symbolMatch && !underlyingMatch && !notesMatch) return false;
      }

      if (
        contractTypeFilter !== 'all' &&
        trade.contractType !== contractTypeFilter
      )
        return false;
      if (optionTypeFilter !== 'all' && trade.optionType !== optionTypeFilter)
        return false;
      if (brokerFilter !== 'all' && trade.brokerAccountId !== brokerFilter)
        return false;

      return true;
    });
  }, [trades, search, contractTypeFilter, optionTypeFilter, brokerFilter]);

  const sortedTrades = useMemo(() => {
    return [...filteredTrades].sort((a, b) => {
      let valA: string | number = a[sortField] ?? '';
      let valB: string | number = b[sortField] ?? '';

      if (sortField === 'exitDate') {
        valA = a.exitDate || a.createdAt || '';
        valB = b.exitDate || b.createdAt || '';
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredTrades, sortField, sortOrder]);

  // Paginated Trades
  const totalPages = Math.max(1, Math.ceil(sortedTrades.length / pageSize));
  const pageClamped = Math.min(currentPage, totalPages);
  const paginatedTrades = sortedTrades.slice(
    (pageClamped - 1) * pageSize,
    pageClamped * pageSize
  );

  // Summary Metrics
  const metrics: FnoMetrics = useMemo(() => {
    let totalRealizedPnl = 0;
    let totalCharges = 0;
    let profitableCount = 0;
    let futuresCount = 0;
    let optionsCount = 0;

    trades.forEach((t) => {
      const pnl = Number(t.realizedPnl || 0);
      totalRealizedPnl += pnl;
      totalCharges += Number(t.totalCharges || 0);
      if (pnl > 0) profitableCount++;
      if (t.contractType === 'future') futuresCount++;
      if (t.contractType === 'option') optionsCount++;
    });

    const totalCount = trades.length;
    const winRate = totalCount > 0 ? (profitableCount / totalCount) * 100 : 0;

    return {
      totalRealizedPnl,
      totalCharges,
      totalCount,
      profitableCount,
      futuresCount,
      optionsCount,
      winRate,
    };
  }, [trades]);

  const hasActiveFilters =
    search !== '' ||
    contractTypeFilter !== 'all' ||
    optionTypeFilter !== 'all' ||
    brokerFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setContractTypeFilter('all');
    setOptionTypeFilter('all');
    setBrokerFilter('all');
    setCurrentPage(1);
  };

  const getBrokerName = (trade: FnoTradeResponse) => {
    if (trade.brokerAccountName) return trade.brokerAccountName;
    const acc = brokerAccounts.find((b) => b.id === trade.brokerAccountId);
    return acc?.name || 'Broker';
  };

  const toggleSort = (
    field: 'exitDate' | 'tradingSymbol' | 'realizedPnl' | 'buyValue'
  ) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return {
    trades,
    search,
    setSearch,
    contractTypeFilter,
    setContractTypeFilter,
    optionTypeFilter,
    setOptionTypeFilter,
    brokerFilter,
    setBrokerFilter,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    deletingTrade,
    setDeletingTrade,
    isDeleting,
    sortedTrades,
    totalPages,
    pageClamped,
    paginatedTrades,
    metrics,
    hasActiveFilters,
    clearFilters,
    getBrokerName,
    toggleSort,
    handleRefresh,
    handleDeleteConfirm,
  };
}
