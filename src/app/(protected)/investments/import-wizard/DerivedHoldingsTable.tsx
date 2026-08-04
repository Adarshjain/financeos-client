'use client';

import { Layers } from 'lucide-react';
import React from 'react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DerivedHolding } from '@/lib/types';
import { formatMoney } from '@/lib/utils';

interface DerivedHoldingsTableProps {
  holdings: DerivedHolding[];
}

export function DerivedHoldingsTable({ holdings }: DerivedHoldingsTableProps) {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-slate-50/50 dark:bg-slate-950/30">
      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
        <Layers className="w-3.5 h-3.5 text-purple-600" />
        Derived Open Delivery Holdings ({holdings.length})
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent text-[11px] bg-slate-100 dark:bg-slate-900">
            <TableHead className="py-1 h-7">Instrument</TableHead>
            <TableHead className="py-1 h-7 text-right">Open Qty</TableHead>
            <TableHead className="py-1 h-7 text-right">Clean Avg Cost</TableHead>
            <TableHead className="py-1 h-7 text-right">Cost Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((h, i) => (
            <TableRow key={i} className="text-[11px] h-7 border-slate-100 dark:border-slate-800">
              <TableCell className="py-1 font-semibold">
                {h.symbol} <span className="text-[10px] text-slate-400 font-normal">{h.isin ? `(${h.isin})` : ''}</span>
              </TableCell>
              <TableCell className="py-1 text-right tabular-nums font-mono">{h.quantity}</TableCell>
              <TableCell className="py-1 text-right tabular-nums">{formatMoney(h.avgCost)}</TableCell>
              <TableCell className="py-1 text-right tabular-nums font-bold">{formatMoney(h.costValue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
