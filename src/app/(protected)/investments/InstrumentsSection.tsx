'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, Edit, Layers, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { TablePagination } from '@/components/reports/views/TablePagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Instrument } from '@/lib/types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

import { CreateInstrumentDialog } from './CreateInstrumentDialog';
import { EditInstrumentDialog } from './EditInstrumentDialog';

interface InstrumentsSectionProps {
  instruments: Instrument[];
}

type SortOrder = 'none' | 'asc' | 'desc';

export function InstrumentsSection({ instruments }: InstrumentsSectionProps) {
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(24);
  const [sortOrder, setSortOrder] = useState<SortOrder>('none');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(0);
  };

  const handleTypeFilterChange = (val: string) => {
    setTypeFilter(val);
    setPage(0);
  };

  const getTypeBadge = (type: string) => {
    const formatted = type ? type.replace('_', ' ').toUpperCase() : 'OTHER';
    let colorClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-800';

    if (type === 'stock') {
      colorClass = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    } else if (type === 'mutual_fund') {
      colorClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    } else if (type === 'etf') {
      colorClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    }

    return (
      <Badge variant="outline" className={`font-bold text-[10px] uppercase px-2 py-0.5 ${colorClass}`}>
        {formatted}
      </Badge>
    );
  };

  const getIdentifier = (inst: Instrument) => {
    if (inst.type === 'mutual_fund') {
      return inst.amfiCode ? `AMFI: ${inst.amfiCode}` : '—';
    }
    return inst.yahooSymbol ? `Yahoo: ${inst.yahooSymbol}` : '—';
  };

  const toggleSort = () => {
    setSortOrder((prev) => {
      if (prev === 'none') return 'asc';
      if (prev === 'asc') return 'desc';
      return 'none';
    });
    setPage(0);
  };

  const filteredInstruments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return instruments.filter((inst) => {
      const matchesSearch =
        !query ||
        !!inst.name?.toLowerCase().includes(query) ||
        !!inst.symbol?.toLowerCase().includes(query) ||
        !!inst.yahooSymbol?.toLowerCase().includes(query) ||
        !!inst.amfiCode?.toLowerCase().includes(query) ||
        !!inst.isin?.toLowerCase().includes(query);

      const matchesType = typeFilter === 'all' || inst.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [instruments, search, typeFilter]);

  const sortedInstruments = useMemo(() => {
    if (sortOrder === 'none') return filteredInstruments;

    return [...filteredInstruments].sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      const cmp = nameA.localeCompare(nameB);
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredInstruments, sortOrder]);

  const totalElements = sortedInstruments.length;
  const totalPages = Math.ceil(totalElements / pageSize) || 1;
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));

  const pagedInstruments = useMemo(() => {
    const start = currentPage * pageSize;
    return sortedInstruments.slice(start, start + pageSize);
  }, [sortedInstruments, currentPage, pageSize]);

  const renderActionBar = (isMobile = false) => (
    <div className={cn('flex items-center gap-2 w-full', isMobile ? 'flex-col sm:flex-row text-xs' : 'flex-wrap')}>
      {/* Search Input */}
      <div className="relative flex-1 min-w-[180px] w-full">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by ticker, name, ISIN..."
          className="h-8 pl-8 pr-7 text-xs font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg w-full"
        />
        {search && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => handleSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter & Action Controls */}
      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
        {/* Type Filter */}
        <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
          <SelectTrigger className="h-8 text-xs w-[125px] bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="stock">Stock</SelectItem>
            <SelectItem value="mutual_fund">Mutual Fund</SelectItem>
            <SelectItem value="etf">ETF</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Button */}
        <Button
          variant={sortOrder === 'none' ? 'outline' : 'secondary'}
          size="sm"
          onClick={toggleSort}
          title="Sort by Name"
        >
          {sortOrder === 'asc' && (
            <>
              <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 mr-1" />
              <span>Name A-Z</span>
            </>
          )}
          {sortOrder === 'desc' && (
            <>
              <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 mr-1" />
              <span>Name Z-A</span>
            </>
          )}
          {sortOrder === 'none' && (
            <>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
              <span>Sort</span>
            </>
          )}
        </Button>

        {/* Add Instrument Dialog Trigger */}
        <CreateInstrumentDialog
          trigger={
            <Button
              size="sm"
              variant="blue"
              className="shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Instrument</span>
            </Button>
          }
        />
      </div>
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
          unit="instrument"
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

      {/* Main Instrument Cards Display */}
      {instruments.length === 0 ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-8 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No instruments recorded yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Add stocks, mutual funds, ETFs, and other assets to build your master registry and track market prices.
            </p>
          </div>
          <CreateInstrumentDialog
            trigger={
              <Button
                size="sm"
                variant="blue"
                className="mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Instrument</span>
              </Button>
            }
          />
        </Card>
      ) : sortedInstruments.length === 0 ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-8 text-center text-xs text-slate-500">
          No instruments match your search or filter.
        </Card>
      ) : (
        <>
          {/* Mobile View: Card-based Layout */}
          <div className="block md:hidden grid grid-cols-1 gap-2 sm:gap-4">
            {pagedInstruments.map((inst) => (
              <Card
                key={inst.id}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/60 transition-all duration-200 overflow-hidden flex flex-col justify-between"
              >
                {/* Header Row: Badge + Exchange Left | Edit Button Right */}
                <CardHeader className="p-3 sm:p-3.5 flex flex-row items-center justify-between border-0 space-y-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {getTypeBadge(inst.type)}
                    {inst.exchange && (
                      <Badge variant="secondary" className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 px-1.5 py-0 border border-slate-200 dark:border-slate-800">
                        {inst.exchange}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <EditInstrumentDialog
                      instrument={inst}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                          title="Edit Instrument"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      }
                    />
                  </div>
                </CardHeader>

                <CardContent className="p-3 sm:p-3.5 space-y-2 flex-1 flex flex-col justify-between pt-0">
                  {/* Title & Identifiers */}
                  <div className="space-y-1">
                    <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate" title={inst.name}>
                      {inst.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex flex-wrap items-center gap-1.5">
                      {inst.symbol && <span className="font-semibold text-slate-700 dark:text-slate-300">{inst.symbol}</span>}
                      {inst.symbol && getIdentifier(inst) !== '—' && <span>•</span>}
                      {getIdentifier(inst) !== '—' && <span>{getIdentifier(inst)}</span>}
                      {inst.isin && <span className="text-[10px] text-slate-400 font-normal">({inst.isin})</span>}
                    </div>
                  </div>

                  {/* Last Price Info Footer */}
                  <div className="flex items-center justify-start gap-2 text-xs">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">LTP</span>
                    <div className="text-right">
                      {inst.lastPrice != null ? (
                        <div>
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 tabular-nums">
                            {formatMoney(inst.lastPrice)}
                          </span>
                          {inst.lastPriceAsOf && (
                            <span className="text-[10px] text-slate-400 tabular-nums ml-1.5">
                              ({formatDate(inst.lastPriceAsOf)})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No price</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop View: Full Table Layout */}
          <Card className="hidden md:block bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                      <TableHead className="text-xs font-medium">Instrument Name / Symbol</TableHead>
                      <TableHead className="text-xs font-medium">Type</TableHead>
                      <TableHead className="text-xs font-medium">Exchange</TableHead>
                      <TableHead className="text-xs font-medium">Identifiers</TableHead>
                      <TableHead className="text-right text-xs font-medium whitespace-nowrap">Last Price (LTP)</TableHead>
                      <TableHead className="text-right text-xs font-medium"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedInstruments.map((inst) => (
                      <TableRow key={inst.id} className="border-slate-100 dark:border-slate-800/60">
                        <TableCell className="py-2.5">
                          <div className="font-medium text-xs text-slate-900 dark:text-slate-100" title={inst.name}>
                            {inst.name}
                          </div>
                          {inst.symbol && (
                            <div className="text-[10px] text-slate-400 font-mono">{inst.symbol}</div>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 text-xs whitespace-nowrap">
                          {getTypeBadge(inst.type)}
                        </TableCell>
                        <TableCell className="py-2.5 text-xs whitespace-nowrap">
                          {inst.exchange ? (
                            <Badge variant="secondary" className="text-[10px] font-medium text-slate-600 dark:text-slate-400 px-1.5 py-0 border border-slate-200 dark:border-slate-800">
                              {inst.exchange}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-400 font-mono">
                          <div className="flex flex-col gap-0.5">
                            {getIdentifier(inst) !== '—' && <span>{getIdentifier(inst)}</span>}
                            {inst.isin && <span className="text-[10px] text-slate-400">ISIN: {inst.isin}</span>}
                            {getIdentifier(inst) === '—' && !inst.isin && <span>—</span>}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 text-right text-xs tabular-nums whitespace-nowrap">
                          {inst.lastPrice != null ? (
                            <div>
                              <span className="font-medium text-xs text-slate-900 dark:text-slate-100">
                                {formatMoney(inst.lastPrice)}
                              </span>
                              {inst.lastPriceAsOf && (
                                <span className="text-[10px] text-slate-400 block whitespace-nowrap">
                                  {formatDate(inst.lastPriceAsOf)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No price</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 text-right">
                          <EditInstrumentDialog
                            instrument={inst}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                                title="Edit Instrument"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
