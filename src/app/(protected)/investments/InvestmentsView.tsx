'use client';

import {
  Award,
  DollarSign,
  Edit,
  History,
  LineChart,
  MoreVertical,
  PieChart,
  Search,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {useMemo, useState} from 'react';

import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '@/components/ui/select';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Account, Broker} from '@/lib/account.types';
import {Dividend, InvestmentSummary, InvestmentTransactionResponse, Position, Sip,} from '@/lib/types';
import {formatDate, formatMoney} from '@/lib/utils';

import {AllocationCharts} from './AllocationCharts';
import {CorporateActionsDialog} from './CorporateActionsDialog';
import {CreateDividendDialog} from './CreateDividendDialog';
import {CreateInvestmentForm} from './CreateInvestmentForm';
import {EditDividendDialog} from './EditDividendDialog';
import {EditPriceDialog} from './EditPriceDialog';
import {EditTransactionDialog} from './EditTransactionDialog';
import {ImportWizardDialog} from './ImportWizardDialog';
import {PriceHistoryDialog} from './PriceHistoryDialog';
import {RefreshPricesButton} from './RefreshPricesButton';
import {SipsSection} from './SipsSection';

interface InvestmentsViewProps {
  summary: InvestmentSummary | null;
  positions: Position[];
  investmentTransactions: InvestmentTransactionResponse[];
  dividends: Dividend[];
  sips: Sip[];
  brokerAccounts: Broker[];
  accounts: Account[];
}

export function InvestmentsView({
                                  summary,
                                  positions,
                                  investmentTransactions,
                                  dividends,
                                  sips,
                                  brokerAccounts,
                                  accounts,
                                }: InvestmentsViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'holdings' | 'actions'>('holdings');
  const [holdingSearch, setHoldingSearch] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState<string>('all');
  const [selectedBrokerFilter, setSelectedBrokerFilter] = useState<string>('all');

  const parseNumber = (val: string | number | null | undefined): number => {
    if (val === null || val === undefined) return 0;
    return typeof val === 'string' ? parseFloat(val) : val;
  };

  const getAccountName = (accountId: string | undefined) => {
    if (!accountId) return '—';
    const acc = accounts.find((a) => a.id === accountId);
    return acc?.name || 'Broker';
  };

  const getInstrumentDisplayName = (tx: InvestmentTransactionResponse) => {
    const { name, symbol } = tx.instrument;
    return symbol ? `${name} (${symbol})` : name;
  };

  const totalPnlNum = parseNumber(summary?.totalPnl);
  const totalUnrealizedNum = parseNumber(summary?.totalUnrealized);
  const absReturnNum = parseNumber(summary?.absoluteReturnPercent);
  const xirrNum = summary?.xirr !== undefined && summary?.xirr !== null ? parseNumber(summary.xirr) : null;

  const getTypeBadge = (type: string | undefined) => {
    switch (type?.toLowerCase()) {
      case 'buy':
        return (
            <Badge
                className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border-0 font-bold text-[10px]">
              BUY
            </Badge>
        );
      case 'sell':
        return (
            <Badge
                className="bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400 border-0 font-bold text-[10px]">
              SELL
            </Badge>
        );
      default:
        return <Badge variant="secondary" className="text-[10px]">{type || 'Unknown'}</Badge>;
    }
  };

  const getSourceBadge = (source?: string) => {
    if (!source) return null;
    switch (source.toUpperCase()) {
      case 'AMFI':
        return <Badge
            className="text-[8px] px-1 py-0 bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-0 font-bold">AMFI</Badge>;
      case 'YAHOO':
        return <Badge
            className="text-[8px] px-1 py-0 bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-0 font-bold">YAHOO</Badge>;
      case 'MANUAL':
        return <Badge
            className="text-[8px] px-1 py-0 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-0 font-bold">MANUAL</Badge>;
      default:
        return <Badge variant="secondary" className="text-[8px] px-1 py-0 font-bold">{source}</Badge>;
    }
  };

  const isManualOnly = (pos: Position): boolean => {
    const type = pos.instrument?.type?.toLowerCase();
    if (type === 'stock' || type === 'etf') {
      return !pos.instrument.yahooSymbol;
    }
    if (type === 'mutual_fund') {
      return !pos.instrument.amfiCode;
    }
    return false;
  };

  // Filter holdings based on search and filters
  const filteredPositions = useMemo(() => {
    return positions.filter((pos) => {
      const matchSearch =
          !holdingSearch ||
          pos.instrument.name.toLowerCase().includes(holdingSearch.toLowerCase()) ||
          (pos.instrument.symbol && pos.instrument.symbol.toLowerCase().includes(holdingSearch.toLowerCase()));

      const matchType =
          selectedAssetType === 'all' ||
          pos.instrument.type?.toLowerCase() === selectedAssetType.toLowerCase();

      const matchBroker =
          selectedBrokerFilter === 'all' || pos.brokerAccountId === selectedBrokerFilter;

      return matchSearch && matchType && matchBroker;
    });
  }, [positions, holdingSearch, selectedAssetType, selectedBrokerFilter]);

  return (
      <div className="pb-20 p-3 sm:p-6 space-y-2 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
        {/* Top Header */}
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          Portfolio
          <Badge variant="outline" className="text-xs font-bold font-mono">
            {positions.length} Holdings
          </Badge>
        </h1>

        {/* Main Tabs Bar using existing @/components/ui/tabs */}
        <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'overview' | 'holdings' | 'actions')}
            className="w-full space-y-5"
        >
          <TabsList className="grid w-full grid-cols-3 max-w-md bg-slate-100 dark:bg-slate-900">
            <TabsTrigger value="overview" className="text-xs font-bold">
              Overview & Reports
            </TabsTrigger>
            <TabsTrigger value="holdings" className="text-xs font-bold gap-1 px-0 whitespace-normal">
              Holdings
              <span
                  className="text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
              {positions.length}
            </span>
            </TabsTrigger>
            <TabsTrigger value="actions" className="text-xs font-bold">
              Tradebook & Actions
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW & REPORTS */}
          <TabsContent value="overview" className="mt-0 space-y-6 animate-in fade-in-50 duration-200">
            {/* Zerodha Console Style Portfolio Summary Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card
                  className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                  <span
                      className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <PieChart className="w-4 h-4 text-purple-600 dark:text-purple-400"/>
                    Portfolio Holdings Value
                  </span>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {positions.length} Positions
                    </Badge>
                  </div>
                  <div>
                    <div
                        className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                      {formatMoney(summary?.totalCurrentValue)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <span>Total Invested: <strong
                            className="text-slate-700 dark:text-slate-300 tabular-nums">{formatMoney(summary?.totalInvested)}</strong></span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card
                  className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                  <span
                      className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <TrendingUp className={`w-4 h-4 ${totalPnlNum >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}/>
                    Overall Portfolio P&L
                  </span>
                    {summary?.absoluteReturnPercent && (
                        <Badge className={`text-xs font-extrabold border-0 ${
                            totalPnlNum >= 0
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                        }`}>
                          {absReturnNum >= 0 ? '+' : ''}{summary.absoluteReturnPercent}%
                        </Badge>
                    )}
                  </div>
                  <div>
                    <div className={`text-2xl sm:text-3xl font-black tabular-nums tracking-tight ${
                        totalPnlNum >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {totalPnlNum >= 0 ? '+' : ''}{formatMoney(summary?.totalPnl)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                    <span>Unrealized: <strong
                        className={totalUnrealizedNum >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                      {totalUnrealizedNum >= 0 ? '+' : ''}{formatMoney(summary?.totalUnrealized)}
                    </strong></span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card
                  className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
                <div className="p-4 sm:p-5 space-y-3">
                <span
                    className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500"/>
                  Returns & Income Summary
                </span>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="text-[11px] text-slate-500">Annualized XIRR</div>
                      <div className={`text-base font-black tabular-nums ${
                          (xirrNum ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {summary?.xirr ? `${(xirrNum ?? 0) >= 0 ? '+' : ''}${summary.xirr}%` : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Dividends Income</div>
                      <div className="text-base font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatMoney(summary?.totalDividends)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Abs Return %</div>
                      <div className={`text-xs font-extrabold tabular-nums ${
                          absReturnNum >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {summary?.absoluteReturnPercent ? `${absReturnNum >= 0 ? '+' : ''}${summary.absoluteReturnPercent}%` : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Total Charges Paid</div>
                      <div className="text-xs font-extrabold tabular-nums text-slate-700 dark:text-slate-300">
                        {formatMoney(summary?.totalCharges)}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Allocation Charts */}
            <AllocationCharts summary={summary} positions={positions}/>

            {/* Income & Dividends Table */}
            <Card
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400"/>
                  Income & Dividends ({dividends.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {dividends.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-500">
                      No dividends recorded yet.
                    </div>
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
                                <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                  {div.symbol}
                                </div>
                              </TableCell>
                              <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-400">
                                {getAccountName(div.brokerAccountId)}
                              </TableCell>
                              <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                                {formatDate(div.exDate || div.payDate)}
                              </TableCell>
                              <TableCell
                                  className="py-2.5 text-right font-black text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {formatMoney(div.amount)}
                              </TableCell>
                              <TableCell className="py-2.5 text-right">
                                <EditDividendDialog dividend={div}/>
                              </TableCell>
                            </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: HOLDINGS VIEW */}
          <TabsContent value="holdings" className="mt-0 space-y-2 animate-in fade-in-50 duration-200">
            {/* Holdings Overview Top Card */}
            <Card
                className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
              <div className="p-4 sm:p-5 space-y-4">
                <div
                    className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <div
                        className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total
                      Invested
                    </div>
                    <div
                        className="text-xl sm:text-2xl font-black tabular-nums tracking-tight mt-0.5 text-slate-900 dark:text-white">
                      {formatMoney(summary?.totalInvested)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                        className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Current
                      Value
                    </div>
                    <div
                        className="text-xl sm:text-2xl font-black tabular-nums tracking-tight mt-0.5 text-slate-900 dark:text-white">
                      {formatMoney(summary?.totalCurrentValue)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Total P&L</span>
                  <div className="flex items-center gap-2">
                  <span className={`text-xl sm:text-2xl font-black tabular-nums ${
                      totalPnlNum >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {totalPnlNum >= 0 ? '+' : ''}{formatMoney(summary?.totalPnl)}
                  </span>
                    {summary?.totalUnrealizedPercent && (
                        <Badge className={`text-xs font-black px-2 py-0.5 border-0 ${
                            totalPnlNum >= 0
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                        }`}>
                          {totalPnlNum >= 0 ? '+' : ''}{summary.totalUnrealizedPercent}%
                        </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Zerodha Filters Bar */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <Input
                  type="text"
                  placeholder="Search holdings by symbol or name..."
                  value={holdingSearch}
                  onChange={(e) => setHoldingSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={selectedAssetType} onValueChange={setSelectedAssetType}>
                <SelectTrigger
                    className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold w-[130px]">
                  <SelectValue placeholder="Asset Type"/>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  <SelectItem value="all" className="text-xs">All Assets</SelectItem>
                  <SelectItem value="stock" className="text-xs">Equity / Stocks</SelectItem>
                  <SelectItem value="mutual_fund" className="text-xs">Mutual Funds</SelectItem>
                  <SelectItem value="etf" className="text-xs">ETFs</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedBrokerFilter} onValueChange={setSelectedBrokerFilter}>
                <SelectTrigger
                    className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold w-[140px]">
                  <SelectValue placeholder="Broker Account"/>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  <SelectItem value="all" className="text-xs">All Brokers</SelectItem>
                  {brokerAccounts.map((b) => (
                      <SelectItem key={b.id} value={b.id} className="text-xs">
                        {b.name}
                      </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Zerodha Holdings Items (Card List for Mobile / Screenshot View) */}
            {filteredPositions.length === 0 ? (
                <div
                    className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  No holdings found matching filters.
                </div>
            ) : (
                <div className="space-y-2">
                  {filteredPositions.map((pos) => {
                    const unrl = parseNumber(pos.unrealizedGainLoss);
                    const unrlPct = pos.unrealizedGainLossPercent ? parseNumber(pos.unrealizedGainLossPercent) : 0;
                    const source = pos.lastPriceSource;
                    const manualOnly = isManualOnly(pos);

                    return (
                        <div
                            key={pos.holdingId || `${pos.brokerAccountId}-${pos.instrument.id}`}
                            className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all space-y-2"
                        >
                          {/* Row 1: Top Metadata (Qty & Avg Cost Left | P&L % Right) */}
                          <div
                              className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                            <div className="flex items-center gap-1.5">
                                <span>Qty. <strong
                                    className="text-slate-800 dark:text-slate-200 font-bold">{pos.quantity}</strong></span>
                              <span>•</span>
                              <span>Avg. <strong
                                  className="text-slate-800 dark:text-slate-200 font-bold">{formatMoney(pos.avgCost)}</strong></span>
                            </div>
                            <div
                                className={`font-bold tabular-nums ${unrlPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {unrlPct >= 0 ? '+' : ''}{pos.unrealizedGainLossPercent}%
                            </div>
                          </div>

                          {/* Row 2: Middle Main Row (Symbol/Name Left | Total P&L Right) */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div
                                  className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{pos.instrument.symbol || pos.instrument.name}</span>
                                <Badge variant="secondary" className="text-[9px] uppercase px-1.5 py-0 font-bold">
                                  {pos.instrument.type}
                                </Badge>
                                {manualOnly && (
                                    <Badge variant="outline"
                                           className="text-[8px] px-1 py-0 font-normal text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800">
                                      manual price only
                                    </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                {pos.instrument.name}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className={`text-base font-black tabular-nums ${
                                  unrl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {unrl >= 0 ? '+' : ''}{formatMoney(pos.unrealizedGainLoss)}
                              </div>
                            </div>
                          </div>

                          {/* Row 3: Bottom Row (Invested Left | LTP, As-Of & 3-Dot Actions Right) */}
                          <div
                              className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                        <span className="text-slate-500">
                          Invested <strong
                            className="text-slate-700 dark:text-slate-300 font-bold tabular-nums">{formatMoney(pos.invested)}</strong>
                        </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium tabular-nums">
                                <span>Current Val: <strong
                                    className="text-slate-900 dark:text-white font-bold">{formatMoney(pos.currentValue)}</strong></span>
                              <span>•</span>
                              <span>LTP <strong
                                  className="text-slate-900 dark:text-white font-bold">{formatMoney(pos.lastPrice)}</strong></span>
                              {getSourceBadge(source)}

                              {/* Three-Dot Actions Dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm"
                                          className="h-7 w-7 p-0 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md">
                                    <MoreVertical className="w-4 h-4"/>
                                    <span className="sr-only">Holding Actions</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end"
                                                     className="w-48 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 p-1">
                                  <DropdownMenuLabel
                                      className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Holding Options
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator/>

                                  <div className="space-y-0.5">
                                    <PriceHistoryDialog
                                        instrument={{...pos.instrument, lastPrice: pos.lastPrice}}
                                        trigger={
                                          <button type="button"
                                                  className="w-full text-left px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded flex items-center gap-2 transition-colors">
                                            <LineChart className="w-3.5 h-3.5 text-blue-500"/>
                                            <span>Price History</span>
                                          </button>
                                        }
                                    />

                                    <CorporateActionsDialog
                                        instrument={pos.instrument}
                                        trigger={
                                          <button type="button"
                                                  className="w-full text-left px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded flex items-center gap-2 transition-colors">
                                            <Zap className="w-3.5 h-3.5 text-amber-500"/>
                                            <span>Corporate Actions</span>
                                          </button>
                                        }
                                    />

                                    <EditPriceDialog
                                        instrument={{
                                          ...pos.instrument,
                                          lastPrice: pos.lastPrice,
                                          lastPriceAsOf: pos.lastPriceAsOf
                                        }}
                                        trigger={
                                          <button type="button"
                                                  className="w-full text-left px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded flex items-center gap-2 transition-colors">
                                            <Edit className="w-3.5 h-3.5 text-emerald-500"/>
                                            <span>Edit Manual Price</span>
                                          </button>
                                        }
                                    />
                                  </div>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                    );
                  })}
                </div>
            )}
          </TabsContent>

          {/* TAB 3: ACTIONS & TRADEBOOK */}
          <TabsContent value="actions" className="mt-0 space-y-6 animate-in fade-in-50 duration-200">
            {/* Actions Quick Toolbar */}
            <div
                className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Portfolio Actions & Sync</h3>
                <p className="text-xs text-slate-500">Import tradebooks, record dividend income, or refresh live
                  instrument prices.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ImportWizardDialog brokerAccounts={brokerAccounts}/>
                <CreateDividendDialog brokerAccounts={brokerAccounts} positions={positions}/>
                <RefreshPricesButton/>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2-Cols: Tradebook & SIPs */}
              <div className="lg:col-span-2 space-y-6">
                {/* SIPs Progress Section */}
                <SipsSection sips={sips} brokerAccounts={brokerAccounts} positions={positions}/>

                {/* Tradebook / Executed Orders Table */}
                <Card
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <History className="w-4 h-4 text-blue-600 dark:text-blue-400"/>
                      Tradebook / Executed Trades ({investmentTransactions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {investmentTransactions.length === 0 ? (
                        <div className="text-center py-10 text-xs text-slate-500">
                          No trades recorded yet.
                        </div>
                    ) : (
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
                                  {tx.brokerName}
                                </TableCell>
                                <TableCell className="py-2.5">
                                  {getTypeBadge(tx.type)}
                                </TableCell>
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
                                    <EditTransactionDialog transaction={tx}/>
                                  </TableCell>
                                </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right 1-Col: Record Trade Form */}
              <div>
                <CreateInvestmentForm brokerAccounts={brokerAccounts}/>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
  );
}
