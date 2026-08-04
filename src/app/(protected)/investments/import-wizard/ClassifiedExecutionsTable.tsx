'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InstrumentSearchField } from '../InstrumentSearchField';
import { ReconciledExecution } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';
import { RowState } from './types';

interface ClassifiedExecutionsTableProps {
  executions: ReconciledExecution[];
  rowStates: Record<number, RowState>;
  onToggleSkip: (rowIndex: number, currentSkip: boolean) => void;
  onMapInstrument: (rowIndex: number, inst: { id: string; name: string }) => void;
  onCreateNew: (rowIndex: number, createNew: boolean) => void;
}

export function ClassifiedExecutionsTable({
  executions,
  rowStates,
  onToggleSkip,
  onMapInstrument,
  onCreateNew,
}: ClassifiedExecutionsTableProps) {
  const sortedExecutions = React.useMemo(() => {
    return [...executions].sort((a, b) => {
      const aAttention = !a.matchedInstrument || a.isDuplicate;
      const bAttention = !b.matchedInstrument || b.isDuplicate;
      if (aAttention !== bAttention) return aAttention ? -1 : 1;
      return a.tradeDate.localeCompare(b.tradeDate);
    });
  }, [executions]);

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-white dark:bg-slate-950">
      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
        Classified Executions ({executions.length})
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent text-[11px] bg-slate-50 dark:bg-slate-900">
            <TableHead className="w-8 px-1 text-center py-1 h-7"></TableHead>
            <TableHead className="py-1 px-1 h-7">Date & Side</TableHead>
            <TableHead className="py-1 px-1 h-7">CNC/MIS</TableHead>
            <TableHead className="py-1 px-1 h-7">Scrip</TableHead>
            <TableHead className="py-1 px-1 h-7 text-right">Qty × Price</TableHead>
            <TableHead className="py-1 px-1 h-7">Status / Map</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedExecutions.map((exec) => {
            const state = rowStates[exec.rowIndex] || { skip: false };
            return (
              <TableRow
                key={exec.rowIndex}
                className={`text-[11px] border-slate-100 dark:border-slate-800 ${state.skip ? 'opacity-50 bg-slate-50/50' : ''}`}
              >
                <TableCell className="text-center py-1 px-2">
                  <Checkbox
                    checked={!state.skip}
                    onCheckedChange={() => onToggleSkip(exec.rowIndex, !!state.skip)}
                  />
                </TableCell>
                <TableCell className="py-1 px-2 tabular-nums">
                  <div className="whitespace-nowrap">{formatDate(exec.tradeDate)}</div>
                  <Badge
                    className={`text-[8px] px-1 py-0 ${exec.type === 'buy' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}
                  >
                    {exec.type.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="py-1 px-2">
                  <Badge
                    variant="outline"
                    className={`text-[8px] px-1 py-0 ${exec.settlementType === 'intraday' ? 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40' : 'border-purple-300 bg-purple-50 text-purple-800 dark:bg-purple-950/40'}`}
                  >
                    {exec.settlementType.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="py-1 px-2">
                  <div className="font-semibold text-slate-900 dark:text-white">{exec.symbol}</div>
                  <div className="text-[9px] text-slate-400">
                    {exec.isin ? exec.isin : ''} • {exec.exchange}
                  </div>
                </TableCell>
                <TableCell className="py-1 px-2 text-right tabular-nums">
                  <div>
                    {exec.quantity} × {formatMoney(exec.price)}
                  </div>
                  <div className="text-[9px] text-slate-400">{formatMoney(exec.totalValue)}</div>
                </TableCell>
                <TableCell className="py-1 px-2">
                  <div className="flex items-center gap-1 flex-wrap">
                    {state?.selectedInstrumentId ? (
                      <div className="flex items-center gap-1">
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium text-[11px]">
                          ✓ {state.selectedInstrumentName || 'Mapped'}
                        </span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="text-[10px] text-slate-400 underline hover:text-slate-600"
                            >
                              change
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-3" align="start">
                            <div className="text-xs font-semibold mb-2">Map instrument for {exec.symbol}</div>
                            <InstrumentSearchField
                              type="stock"
                              placeholder={`Search for ${exec.symbol}…`}
                              onResolved={(inst) => onMapInstrument(exec.rowIndex, inst)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    ) : state?.createNew ? (
                      <div className="flex items-center gap-1">
                        <span className="text-blue-700 dark:text-blue-400 font-medium text-[11px]">
                          ✦ New: {exec.symbol}
                        </span>
                        <span className="text-[9px] text-slate-400">no live price</span>
                        <button
                          type="button"
                          onClick={() => onCreateNew(exec.rowIndex, false)}
                          className="text-[10px] text-slate-400 underline hover:text-slate-600"
                        >
                          undo
                        </button>
                      </div>
                    ) : exec.matchedInstrument ? (
                      <div className="text-emerald-800 dark:text-emerald-300 font-medium">
                        {exec.matchedInstrument.name}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300">
                          Unmatched
                        </Badge>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" size="sm" className="h-5 px-1.5 text-[10px]">
                              Map instrument
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-3" align="start">
                            <div className="text-xs font-semibold mb-2">Search & map instrument for {exec.symbol}</div>
                            <InstrumentSearchField
                              type="stock"
                              placeholder={`Search for ${exec.symbol}…`}
                              onResolved={(inst) => onMapInstrument(exec.rowIndex, inst)}
                            />
                          </PopoverContent>
                        </Popover>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-5 px-1.5 text-[10px] text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900"
                          onClick={() => onCreateNew(exec.rowIndex, true)}
                        >
                          Create new
                        </Button>
                      </div>
                    )}
                    {exec.isDuplicate && (
                      <Badge variant="outline" className="text-purple-600 border-purple-300 ml-1">
                        Duplicate
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
