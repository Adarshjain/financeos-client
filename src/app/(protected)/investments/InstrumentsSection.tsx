'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, Coins, Edit } from 'lucide-react';
import { useMemo, useState } from 'react';

import { TablePagination } from '@/components/reports/views/TablePagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Instrument } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

import { EditInstrumentDialog } from './EditInstrumentDialog';

interface InstrumentsSectionProps {
  instruments: Instrument[];
}

type SortOrder = 'none' | 'asc' | 'desc';

export function InstrumentsSection({ instruments }: InstrumentsSectionProps) {
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(25);
  const [sortOrder, setSortOrder] = useState<SortOrder>('none');

  const getTypeBadge = (type: string) => {
    const formatted = type ? type.replace('_', ' ').toUpperCase() : 'OTHER';
    let colorClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    if (type === 'stock') colorClass = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
    if (type === 'mutual_fund') colorClass = 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300';
    if (type === 'etf') colorClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';

    return (
      <Badge className={`font-bold border-0 text-[10px] uppercase ${colorClass}`}>
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

  const sortedInstruments = useMemo(() => {
    if (sortOrder === 'none') return instruments;

    return [...instruments].sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      const cmp = nameA.localeCompare(nameB);
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [instruments, sortOrder]);

  const totalElements = sortedInstruments.length;
  const totalPages = Math.ceil(totalElements / pageSize) || 1;
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));

  const pagedInstruments = useMemo(() => {
    const start = currentPage * pageSize;
    return sortedInstruments.slice(start, start + pageSize);
  }, [sortedInstruments, currentPage, pageSize]);

  return (
    <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
      <CardHeader className="py-2 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base font-bold flex items-center">
          Instruments ({instruments.length})
        </CardTitle>

        {instruments.length > 0 && (
          <Button
            variant={sortOrder === 'none' ? 'outline' : 'secondary'}
            size="sm"
            onClick={toggleSort}
            className="h-8 text-xs font-semibold flex items-center rounded-lg border-slate-200 dark:border-slate-800"
            title="Sort by Name (Click to cycle: A-Z -> Z-A -> Default)"
          >
            {sortOrder === 'asc' && (
              <>
                <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Asc</span>
              </>
            )}
            {sortOrder === 'desc' && (
              <>
                <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Desc</span>
              </>
            )}
            {sortOrder === 'none' && (
              <>
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span>Sort</span>
              </>
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {instruments.length === 0 ? (
          <div className="text-center py-8 px-4 space-y-2">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No instruments recorded yet
            </p>
            <p className="text-xs text-slate-500">
              Add instruments to track stocks, mutual funds, and ETFs.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
              {pagedInstruments.map((inst) => (
                <div key={inst.id} className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {getTypeBadge(inst.type)}
                      {inst.exchange && (
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          {inst.exchange}
                        </span>
                      )}
                    </div>
                    <EditInstrumentDialog
                      instrument={inst}
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      }
                    />
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {inst.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                        {inst.symbol ? `${inst.symbol} • ` : ''}{getIdentifier(inst)}
                      </div>
                    </div>
                    <div className="text-right">
                      {inst.lastPrice != null ? (
                        <>
                          <div className="font-bold text-xs text-slate-900 dark:text-slate-100 tabular-nums">
                            {formatMoney(inst.lastPrice)}
                          </div>
                          {inst.lastPriceAsOf && (
                            <div className="text-[10px] text-slate-400 tabular-nums">
                              {formatDate(inst.lastPriceAsOf)}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No price</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                    <TableHead className="text-xs font-semibold whitespace-nowrap">Type</TableHead>
                    <TableHead
                      className="text-xs font-semibold whitespace-nowrap cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={toggleSort}
                    >
                      <div className="flex items-center gap-1">
                        <span>Name</span>
                        {sortOrder === 'asc' && <ArrowUp className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
                        {sortOrder === 'desc' && <ArrowDown className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
                        {sortOrder === 'none' && <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />}
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-semibold whitespace-nowrap">Symbol / Exchange</TableHead>
                    <TableHead className="text-xs font-semibold whitespace-nowrap">Ticker / AMFI Code</TableHead>
                    <TableHead className="text-right text-xs font-semibold whitespace-nowrap">Last Price</TableHead>
                    <TableHead className="text-right text-xs font-semibold whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedInstruments.map((inst) => (
                    <TableRow key={inst.id} className="border-slate-100 dark:border-slate-800/60">
                      <TableCell className="py-2.5">{getTypeBadge(inst.type)}</TableCell>
                      <TableCell className="py-2.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                        {inst.name}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                        {inst.symbol || '—'}
                        {inst.exchange ? ` (${inst.exchange})` : ''}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">
                        {getIdentifier(inst)}
                      </TableCell>
                      <TableCell className="py-2.5 text-right whitespace-nowrap">
                        {inst.lastPrice != null ? (
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-slate-100 tabular-nums">
                              {formatMoney(inst.lastPrice)}
                            </div>
                            {inst.lastPriceAsOf && (
                              <div className="text-[10px] text-slate-400 tabular-nums">
                                {formatDate(inst.lastPriceAsOf)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No price</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        <EditInstrumentDialog
                          instrument={inst}
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
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
                unit="instrument"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
