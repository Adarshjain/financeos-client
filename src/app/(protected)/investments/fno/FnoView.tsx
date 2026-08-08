'use client';

import {Activity, ArrowUpDown, Download, Search, Trash2, X,} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {useMemo, useState} from 'react';
import {toast} from 'sonner';

import {deleteFnoTrade} from '@/actions/investments';
import {PageActionBar} from '@/components/layout/PageActionBarContext';
import {TablePagination} from '@/components/reports/views/TablePagination';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Broker} from '@/lib/account.types';
import {FnoTradeListResponse, FnoTradeResponse} from '@/lib/types';
import {formatDate, formatMoney} from '@/lib/utils';

import {ImportWizardDialog} from '../ImportWizardDialog';
import {CreateFnoTradeDialog} from './CreateFnoTradeDialog';
import {EditFnoTradeDialog} from './EditFnoTradeDialog';

interface FnoViewProps {
  initialFnoData: FnoTradeListResponse;
  brokerAccounts: Broker[];
}

export function FnoView({initialFnoData, brokerAccounts}: FnoViewProps) {
  const router = useRouter();

  const [trades, setTrades] = useState<FnoTradeResponse[]>(initialFnoData.trades || []);

  // Filter States
  const [search, setSearch] = useState('');
  const [contractTypeFilter, setContractTypeFilter] = useState<string>('all');
  const [optionTypeFilter, setOptionTypeFilter] = useState<string>('all');
  const [brokerFilter, setBrokerFilter] = useState<string>('all');

  // Sorting State
  const [sortField, setSortField] = useState<'exitDate' | 'tradingSymbol' | 'realizedPnl' | 'buyValue'>('exitDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Delete Confirmation Modal
  const [deletingTrade, setDeletingTrade] = useState<FnoTradeResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRefresh = () => {
    router.refresh();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTrade) return;
    setIsDeleting(true);
    try {
      const res = await deleteFnoTrade(deletingTrade.id);
      if (res.success) {
        toast.success(`Deleted trade for ${deletingTrade.tradingSymbol}`);
        setTrades((prev) => prev.filter((t) => t.id !== deletingTrade.id));
        setDeletingTrade(null);
        handleRefresh();
      } else {
        toast.error(res.error?.message || 'Failed to delete trade');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter & Sort Logic
  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const symbolMatch = trade.tradingSymbol?.toLowerCase().includes(q);
        const underlyingMatch = trade.underlyingSymbol?.toLowerCase().includes(q);
        const notesMatch = trade.notes?.toLowerCase().includes(q);
        if (!symbolMatch && !underlyingMatch && !notesMatch) return false;
      }

      if (contractTypeFilter !== 'all' && trade.contractType !== contractTypeFilter) return false;
      if (optionTypeFilter !== 'all' && trade.optionType !== optionTypeFilter) return false;
      if (brokerFilter !== 'all' && trade.brokerAccountId !== brokerFilter) return false;

      return true;
    });
  }, [trades, search, contractTypeFilter, optionTypeFilter, brokerFilter]);

  const sortedTrades = useMemo(() => {
    return [...filteredTrades].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

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
  const paginatedTrades = sortedTrades.slice((pageClamped - 1) * pageSize, pageClamped * pageSize);

  // Summary Metrics
  const metrics = useMemo(() => {
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

  const hasActiveFilters = search !== '' || contractTypeFilter !== 'all' || optionTypeFilter !== 'all' || brokerFilter !== 'all';

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

  const toggleSort = (field: 'exitDate' | 'tradingSymbol' | 'realizedPnl' | 'buyValue') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
      <div className="p-3 sm:p-5 pb-20 space-y-2 max-w-7xl mx-auto w-full min-w-0">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Futures & Options (FnO)
          </h1>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <ImportWizardDialog
                brokerAccounts={brokerAccounts}
                trigger={
                  <Button variant="outline" size="sm"
                          className="rounded-xl text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-800 h-8">
                    <Download className="w-3.5 h-3.5"/>
                    Import Statement
                  </Button>
                }
                onSuccess={handleRefresh}
            />
            <CreateFnoTradeDialog brokerAccounts={brokerAccounts} onSuccess={handleRefresh}/>
          </div>
        </div>

        {/* Merged Single Summary Card */}
        <Card
            className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm">
          <div
              className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800/60 gap-2 sm:gap-0">
            {/* Total Realized P&L */}
            <div className="sm:px-3 pt-1 sm:pt-0">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Realized P&L</div>
              <div className={`text-base sm:text-lg font-black tracking-tight mt-0.5 ${
                  metrics.totalRealizedPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {metrics.totalRealizedPnl >= 0 ? '+' : ''}{formatMoney(metrics.totalRealizedPnl)}
              </div>
            </div>

            {/* Total Trades */}
            <div className="sm:px-3 pt-1 sm:pt-0">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Trades</div>
              <div
                  className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white mt-0.5 flex items-baseline gap-1.5">
                <span>{metrics.totalCount}</span>
                <span className="text-[10px] font-normal text-slate-400">
                ({metrics.futuresCount} Fut / {metrics.optionsCount} Opt)
              </span>
              </div>
            </div>

            {/* Win Rate */}
            <div className="sm:px-3 pt-1 sm:pt-0">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Win Rate</div>
              <div className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white mt-0.5">
                {metrics.winRate.toFixed(1)}%
              </div>
            </div>

            {/* Total Charges */}
            <div className="sm:px-3 pt-1 sm:pt-0">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Charges & Taxes</div>
              <div className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white mt-0.5">
                {formatMoney(metrics.totalCharges)}
              </div>
            </div>
          </div>
        </Card>

        {/* Page Action Bar (Search, Filters & Pagination combined for Desktop + Mobile PageActionBar Slot) */}
        <Card
            className="hidden md:block border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-2.5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            {/* Search & Filter Controls */}
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400"/>
                <Input
                    placeholder="Search symbol or underlying..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-8 rounded-lg h-8 text-xs"
                />
                {search && (
                    <button
                        onClick={() => setSearch('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5"/>
                    </button>
                )}
              </div>

              {/* Contract Filter */}
              <Select
                  value={contractTypeFilter}
                  onValueChange={(val) => {
                    setContractTypeFilter(val);
                    setCurrentPage(1);
                  }}
              >
                <SelectTrigger className="w-[120px] rounded-lg h-8 text-xs">
                  <SelectValue placeholder="Contract"/>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="text-xs">All Contracts</SelectItem>
                  <SelectItem value="future" className="text-xs">Futures (FUT)</SelectItem>
                  <SelectItem value="option" className="text-xs">Options (OPT)</SelectItem>
                </SelectContent>
              </Select>

              {/* Option Type Filter */}
              <Select
                  value={optionTypeFilter}
                  onValueChange={(val) => {
                    setOptionTypeFilter(val);
                    setCurrentPage(1);
                  }}
              >
                <SelectTrigger className="w-[110px] rounded-lg h-8 text-xs">
                  <SelectValue placeholder="Option Type"/>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="text-xs">All Types</SelectItem>
                  <SelectItem value="CE" className="text-xs">Call (CE)</SelectItem>
                  <SelectItem value="PE" className="text-xs">Put (PE)</SelectItem>
                </SelectContent>
              </Select>

              {/* Broker Filter */}
              {brokerAccounts.length > 0 && (
                  <Select
                      value={brokerFilter}
                      onValueChange={(val) => {
                        setBrokerFilter(val);
                        setCurrentPage(1);
                      }}
                  >
                    <SelectTrigger className="w-[130px] rounded-lg h-8 text-xs">
                      <SelectValue placeholder="Broker"/>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all" className="text-xs">All Brokers</SelectItem>
                      {brokerAccounts.map((b) => (
                          <SelectItem key={b.id} value={b.id} className="text-xs">
                            {b.name}
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              )}

              {hasActiveFilters && (
                  <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="rounded-lg h-8 text-xs text-slate-500 hover:text-slate-900 px-2"
                  >
                    <X className="w-3.5 h-3.5 mr-1"/>
                    Clear
                  </Button>
              )}
            </div>

            {/* Action Bar Pagination */}
            {sortedTrades.length > 0 && (
                <div className="shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  <TablePagination
                      page={{
                        number: pageClamped - 1,
                        size: pageSize,
                        totalElements: sortedTrades.length,
                        totalPages: totalPages,
                      }}
                      onPageChange={(p) => setCurrentPage(p + 1)}
                      onSizeChange={(s) => {
                        setPageSize(s);
                        setCurrentPage(1);
                      }}
                      unit="trade"
                  />
                </div>
            )}
          </div>
        </Card>

        {/* Mobile PageActionBar Slot Integration */}
        <PageActionBar>
          <div className="flex flex-col gap-1.5 w-full text-xs">
            {/* Row 1: Search & Contract Type */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400"/>
              <Input
                  placeholder="Search symbol..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 rounded-lg h-8 text-xs bg-white dark:bg-slate-950"
              />
              {search && (
                  <button
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5"/>
                  </button>
              )}
            </div>

            {/* Row 2: Option Type, Broker Filter & Clear */}
            <div className="flex flex-wrap items-center gap-1.5 w-full">
              {/* Contract Type */}
              <Select
                  value={contractTypeFilter}
                  onValueChange={(val) => {
                    setContractTypeFilter(val);
                    setCurrentPage(1);
                  }}
              >
                <SelectTrigger className="w-[105px] rounded-lg h-8 text-xs bg-white dark:bg-slate-950">
                  <SelectValue placeholder="Contract"/>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="text-xs">All Contracts</SelectItem>
                  <SelectItem value="future" className="text-xs">Futures (FUT)</SelectItem>
                  <SelectItem value="option" className="text-xs">Options (OPT)</SelectItem>
                </SelectContent>
              </Select>

              {/* Option Type Filter */}
              <Select
                  value={optionTypeFilter}
                  onValueChange={(val) => {
                    setOptionTypeFilter(val);
                    setCurrentPage(1);
                  }}
              >
                <SelectTrigger className="flex-1 min-w-[95px] rounded-lg h-8 text-xs bg-white dark:bg-slate-950">
                  <SelectValue placeholder="Option"/>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="text-xs">All Options</SelectItem>
                  <SelectItem value="CE" className="text-xs">Call (CE)</SelectItem>
                  <SelectItem value="PE" className="text-xs">Put (PE)</SelectItem>
                </SelectContent>
              </Select>

              {/* Broker Account Filter */}
              {brokerAccounts.length > 0 && (
                  <Select
                      value={brokerFilter}
                      onValueChange={(val) => {
                        setBrokerFilter(val);
                        setCurrentPage(1);
                      }}
                  >
                    <SelectTrigger className="flex-1 min-w-[105px] rounded-lg h-8 text-xs bg-white dark:bg-slate-950">
                      <SelectValue placeholder="Broker"/>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all" className="text-xs">All Brokers</SelectItem>
                      {brokerAccounts.map((b) => (
                          <SelectItem key={b.id} value={b.id} className="text-xs">
                            {b.name}
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              )}

              {hasActiveFilters && (
                  <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="rounded-lg h-8 text-xs text-slate-500 hover:text-slate-900 px-2"
                  >
                    <X className="w-3.5 h-3.5 mr-1"/>
                    Clear
                  </Button>
              )}
            </div>

            {/* Row 3: Pagination */}
            {sortedTrades.length > 0 && (
                <TablePagination
                    page={{
                      number: pageClamped - 1,
                      size: pageSize,
                      totalElements: sortedTrades.length,
                      totalPages: totalPages,
                    }}
                    onPageChange={(p) => setCurrentPage(p + 1)}
                    onSizeChange={(s) => {
                      setPageSize(s);
                      setCurrentPage(1);
                    }}
                    unit="trade"
                    className="w-full px-0.5 pt-0.5"
                />
            )}
          </div>
        </PageActionBar>

        {/* Main Trade Content Area */}
        {paginatedTrades.length === 0 ? (
            <Card
                className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-8 text-center shadow-sm">
              <div
                  className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <Activity className="w-5 h-5"/>
              </div>
              {hasActiveFilters ? (
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">No trades match active
                      filters</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Try clearing filters or search keyword.</p>
                    <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2 rounded-xl text-xs h-8">
                      Clear Filters
                    </Button>
                  </div>
              ) : (
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">No FnO trades recorded yet</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs mx-auto">
                      Log F&O trades manually or import broker Tax P&L statements.
                    </p>
                  </div>
              )}
            </Card>
        ) : (
            <>
              {/* Mobile View: Cards Layout (No horizontal scrolling!) */}
              <div className="block md:hidden space-y-2">
                {paginatedTrades.map((trade) => {
                  const pnl = Number(trade.realizedPnl || 0);
                  const isProfit = pnl >= 0;

                  return (
                      <div
                          key={trade.id}
                          className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1.5"
                      >
                        {/* Top Row: Symbol & Badges Left | P&L Right */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                          {trade.tradingSymbol}
                        </span>
                              {trade.contractType === 'future' ? (
                                  <Badge
                                      className="bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 font-extrabold text-[9px] border-0 px-1.5 py-0">
                                    FUT
                                  </Badge>
                              ) : (
                                  <Badge
                                      className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-extrabold text-[9px] border-0 px-1.5 py-0">
                                    OPT
                                  </Badge>
                              )}
                              {trade.optionType && (
                                  <Badge className={`font-extrabold text-[9px] border-0 px-1.5 py-0 ${
                                      trade.optionType === 'CE'
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                  }`}>
                                    {trade.optionType}
                                  </Badge>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                              {getBrokerName(trade)} • Qty: <strong
                                className="text-slate-700 dark:text-slate-300">{Number(trade.quantity).toLocaleString('en-IN')}</strong>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className={`text-sm font-black tabular-nums ${
                                isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {isProfit ? '+' : ''}{formatMoney(pnl)}
                            </div>
                          </div>
                        </div>

                        {/* Middle Row: Values & Details */}
                        <div
                            className="grid grid-cols-3 gap-2 text-[11px] bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                          <div>
                            <span className="text-slate-400 text-[10px] block">Buy Value</span>
                            <span
                                className="font-semibold text-slate-700 dark:text-slate-300">{formatMoney(Number(trade.buyValue))}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">Sell Value</span>
                            <span
                                className="font-semibold text-slate-700 dark:text-slate-300">{formatMoney(Number(trade.sellValue))}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">Charges</span>
                            <span
                                className="font-semibold text-slate-700 dark:text-slate-300">{formatMoney(Number(trade.totalCharges || 0))}</span>
                          </div>
                        </div>

                        {/* Bottom Row: Dates & Actions */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                          <div>
                            Exit: <span
                              className="font-medium text-slate-700 dark:text-slate-300">{trade.exitDate ? formatDate(trade.exitDate) : '—'}</span>
                            {trade.strikePrice && <span
                                className="ml-1.5">• Strike: ₹{Number(trade.strikePrice).toLocaleString('en-IN')}</span>}
                          </div>

                          <div className="flex items-center gap-1">
                            <EditFnoTradeDialog trade={trade} brokerAccounts={brokerAccounts}
                                                onSuccess={handleRefresh}/>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingTrade(trade)}
                                className="h-6 w-6 p-0 rounded-lg text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5"/>
                            </Button>
                          </div>
                        </div>
                      </div>
                  );
                })}
              </div>

              {/* Desktop View: Full Table */}
              <div className="hidden md:block">
                <Card
                    className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/80 dark:bg-slate-800/50">
                        <TableRow>
                          <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            <button
                                onClick={() => toggleSort('tradingSymbol')}
                                className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white"
                            >
                              Symbol & Contract
                              <ArrowUpDown className="w-3 h-3 text-slate-400"/>
                            </button>
                          </TableHead>
                          <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">Broker</TableHead>
                          <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">Strike</TableHead>
                          <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            <button
                                onClick={() => toggleSort('exitDate')}
                                className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white"
                            >
                              Exit Date
                              <ArrowUpDown className="w-3 h-3 text-slate-400"/>
                            </button>
                          </TableHead>
                          <TableHead
                              className="text-xs font-bold text-slate-700 dark:text-slate-300 text-right">Quantity</TableHead>
                          <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300 text-right">Buy /
                            Sell Value</TableHead>
                          <TableHead
                              className="text-xs font-bold text-slate-700 dark:text-slate-300 text-right">Charges</TableHead>
                          <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300 text-right">
                            <button
                                onClick={() => toggleSort('realizedPnl')}
                                className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white ml-auto"
                            >
                              Realized P&L
                              <ArrowUpDown className="w-3 h-3 text-slate-400"/>
                            </button>
                          </TableHead>
                          <TableHead
                              className="text-xs font-bold text-slate-700 dark:text-slate-300 text-center">Source</TableHead>
                          <TableHead
                              className="text-xs font-bold text-slate-700 dark:text-slate-300 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTrades.map((trade) => {
                          const pnl = Number(trade.realizedPnl || 0);
                          const isProfit = pnl >= 0;

                          return (
                              <TableRow key={trade.id}
                                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                <TableCell className="py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div>
                                      <div
                                          className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                        {trade.tradingSymbol}
                                      </div>
                                      {trade.underlyingSymbol && (
                                          <div className="text-[10px] text-slate-400 font-medium">
                                            Underlying: {trade.underlyingSymbol}
                                          </div>
                                      )}
                                    </div>

                                    <div className="flex flex-wrap gap-1">
                                      {trade.contractType === 'future' ? (
                                          <Badge
                                              className="bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 font-extrabold text-[9px] border-0 px-1.5 py-0">
                                            FUT
                                          </Badge>
                                      ) : (
                                          <Badge
                                              className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-extrabold text-[9px] border-0 px-1.5 py-0">
                                            OPT
                                          </Badge>
                                      )}

                                      {trade.optionType && (
                                          <Badge className={`font-extrabold text-[9px] border-0 px-1.5 py-0 ${
                                              trade.optionType === 'CE'
                                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                          }`}>
                                            {trade.optionType}
                                          </Badge>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>

                                <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                                  {getBrokerName(trade)}
                                </TableCell>

                                <TableCell className="py-2.5 text-xs">
                                  {trade.contractType === 'option' || trade.strikePrice ? (
                                      <div>
                                        {trade.strikePrice && <div
                                            className="font-semibold text-slate-800 dark:text-slate-200">₹{Number(trade.strikePrice).toLocaleString('en-IN')}</div>}
                                      </div>
                                  ) : (
                                      <span className="text-slate-400 text-xs">—</span>
                                  )}
                                </TableCell>

                                <TableCell className="py-2.5 text-xs">
                                  <div className="text-slate-800 dark:text-slate-200 font-medium">
                                    {trade.exitDate ? formatDate(trade.exitDate) : '—'}
                                  </div>
                                  {trade.entryDate && (
                                      <div className="text-[10px] text-slate-400">
                                        Entry: {formatDate(trade.entryDate)}
                                      </div>
                                  )}
                                </TableCell>

                                <TableCell
                                    className="py-2.5 text-xs text-right font-semibold text-slate-900 dark:text-white">
                                  {Number(trade.quantity).toLocaleString('en-IN')}
                                </TableCell>

                                <TableCell className="py-2.5 text-xs text-right">
                                  <div className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                                    Sell: {formatMoney(Number(trade.sellValue))}
                                  </div>
                                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                                    Buy: {formatMoney(Number(trade.buyValue))}
                                  </div>
                                </TableCell>

                                <TableCell className="py-2.5 text-xs text-right text-slate-500 font-medium">
                                  {formatMoney(Number(trade.totalCharges || 0))}
                                </TableCell>

                                <TableCell className="py-2.5 text-xs text-right font-extrabold">
                            <span
                                className={isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                              {isProfit ? '+' : ''}{formatMoney(pnl)}
                            </span>
                                </TableCell>

                                <TableCell className="py-2.5 text-center">
                                  <Badge variant="outline"
                                         className="text-[10px] capitalize rounded-lg border-slate-200 dark:border-slate-800 text-slate-500">
                                    {trade.source || 'manual'}
                                  </Badge>
                                </TableCell>

                                <TableCell className="py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <EditFnoTradeDialog trade={trade} brokerAccounts={brokerAccounts}
                                                        onSuccess={handleRefresh}/>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeletingTrade(trade)}
                                        className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                    >
                                      <Trash2 className="w-3.5 h-3.5"/>
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            </>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deletingTrade} onOpenChange={(open) => !open && setDeletingTrade(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Delete FnO Trade Record
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Are you sure you want to delete the trade record for{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{deletingTrade?.tradingSymbol}</span>?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 pt-2">
              <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingTrade(null)}
                  className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700"
              >
                {isDeleting ? 'Deleting...' : 'Delete Trade'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
