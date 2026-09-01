'use client';

import { Edit } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Instrument } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

import { EditInstrumentDialog } from '../EditInstrumentDialog';

export function getTypeBadge(type: string) {
  const formatted = type ? type.replace('_', ' ').toUpperCase() : 'OTHER';
  let colorClass =
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-800';

  if (type === 'stock') {
    colorClass =
      'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800';
  } else if (type === 'mutual_fund') {
    colorClass =
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  } else if (type === 'etf') {
    colorClass =
      'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800';
  }

  return (
    <Badge
      variant="outline"
      className={`font-bold text-2xs uppercase px-2 py-0.5 ${colorClass}`}
    >
      {formatted}
    </Badge>
  );
}

export function getIdentifier(inst: Instrument) {
  if (inst.type === 'mutual_fund') {
    return inst.amfiCode ? `AMFI: ${inst.amfiCode}` : '—';
  }
  return inst.yahooSymbol ? `Yahoo: ${inst.yahooSymbol}` : '—';
}

interface InstrumentsMobileCardsProps {
  pagedInstruments: Instrument[];
}

export function InstrumentsMobileCards({
  pagedInstruments,
}: InstrumentsMobileCardsProps) {
  return (
    <div className="block md:hidden grid grid-cols-1 gap-2 sm:gap-4">
      {pagedInstruments.map((inst) => (
        <Card
          key={inst.id}
          className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/60 transition-all duration-200 overflow-hidden flex flex-col justify-between"
        >
          {/* Header Row */}
          <CardHeader className="p-3 sm:p-3.5 flex flex-row items-center justify-between border-0 space-y-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {getTypeBadge(inst.type)}
              {inst.exchange && (
                <Badge
                  variant="secondary"
                  className="text-2xs font-semibold text-slate-600 dark:text-slate-400 px-1.5 py-0 border border-slate-200 dark:border-slate-800"
                >
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
              <div
                className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate"
                title={inst.name}
              >
                {inst.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono flex flex-wrap items-center gap-1.5">
                {inst.symbol && (
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {inst.symbol}
                  </span>
                )}
                {inst.symbol && getIdentifier(inst) !== '—' && (
                  <span>•</span>
                )}
                {getIdentifier(inst) !== '—' && (
                  <span>{getIdentifier(inst)}</span>
                )}
                {inst.isin && (
                  <span className="text-2xs text-slate-400 font-normal">
                    ({inst.isin})
                  </span>
                )}
              </div>
            </div>

            {/* Last Price Info Footer */}
            <div className="flex items-center justify-start gap-2 text-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                LTP
              </span>
              <div className="text-right">
                {inst.lastPrice != null ? (
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatMoney(inst.lastPrice)}
                    </span>
                    {inst.lastPriceAsOf && (
                      <span className="text-2xs text-slate-400 tabular-nums ml-1.5">
                        ({formatDate(inst.lastPriceAsOf)})
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    No price
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
