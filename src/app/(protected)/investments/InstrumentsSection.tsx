'use client';

import { Coins, Edit } from 'lucide-react';

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

export function InstrumentsSection({ instruments }: InstrumentsSectionProps) {
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

  return (
    <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Coins className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Instruments ({instruments.length})
        </CardTitle>
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
              {instruments.map((inst) => (
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
                    <TableHead className="text-xs font-semibold whitespace-nowrap">Name</TableHead>
                    <TableHead className="text-xs font-semibold whitespace-nowrap">Symbol / Exchange</TableHead>
                    <TableHead className="text-xs font-semibold whitespace-nowrap">Ticker / AMFI Code</TableHead>
                    <TableHead className="text-right text-xs font-semibold whitespace-nowrap">Last Price</TableHead>
                    <TableHead className="text-right text-xs font-semibold whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instruments.map((inst) => (
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
