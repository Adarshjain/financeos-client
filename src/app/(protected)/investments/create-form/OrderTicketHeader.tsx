'use client';

import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

import { Instrument, InvestmentTransactionType } from '@/lib/types';
import { formatMoney } from '@/lib/utils';

interface OrderTicketHeaderProps {
  type: InvestmentTransactionType;
  selectedInstrument: Instrument | null;
  estNetTotal: number;
}

export function OrderTicketHeader({
  type,
  selectedInstrument,
  estNetTotal,
}: OrderTicketHeaderProps) {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          {type === 'buy' ? (
            <ArrowDownLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <ArrowUpRight className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
              {type.toUpperCase()} ORDER
            </span>
            {selectedInstrument && (
              <span className="text-xs font-bold bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                {selectedInstrument.exchange || 'NSE'}
              </span>
            )}
          </div>
          <h2 className="text-sm font-extrabold mt-0.5 text-slate-900 dark:text-slate-100 truncate max-w-[220px]">
            {selectedInstrument ? selectedInstrument.name : 'Select Instrument'}
          </h2>
        </div>
      </div>
      <div className="text-right pr-10">
        <div className="text-2xs uppercase font-bold text-slate-500 dark:text-slate-400">
          Est. Order Total
        </div>
        <div className="text-sm font-black text-slate-900 dark:text-slate-100 tabular-nums">
          {formatMoney(estNetTotal)}
        </div>
      </div>
    </div>
  );
}
