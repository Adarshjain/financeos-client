'use client';

import { Edit } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Instrument } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

import { EditInstrumentDialog } from '../EditInstrumentDialog';
import { getIdentifier, getTypeBadge } from './InstrumentsMobileCards';

interface InstrumentsTableProps {
  pagedInstruments: Instrument[];
}

export function InstrumentsTable({
  pagedInstruments,
}: InstrumentsTableProps) {
  return (
    <Card className="hidden md:block bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                <TableHead className="text-xs font-medium">
                  Instrument Name / Symbol
                </TableHead>
                <TableHead className="text-xs font-medium">Type</TableHead>
                <TableHead className="text-xs font-medium">
                  Exchange
                </TableHead>
                <TableHead className="text-xs font-medium">
                  Identifiers
                </TableHead>
                <TableHead className="text-right text-xs font-medium whitespace-nowrap">
                  Last Price (LTP)
                </TableHead>
                <TableHead className="text-right text-xs font-medium"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedInstruments.map((inst) => (
                <TableRow
                  key={inst.id}
                  className="border-slate-100 dark:border-slate-800/60"
                >
                  <TableCell className="py-2.5">
                    <div
                      className="font-medium text-xs text-slate-900 dark:text-slate-100"
                      title={inst.name}
                    >
                      {inst.name}
                    </div>
                    {inst.symbol && (
                      <div className="text-2xs text-slate-400 font-mono">
                        {inst.symbol}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5 text-xs whitespace-nowrap">
                    {getTypeBadge(inst.type)}
                  </TableCell>
                  <TableCell className="py-2.5 text-xs whitespace-nowrap">
                    {inst.exchange ? (
                      <Badge
                        variant="secondary"
                        className="text-2xs font-medium text-slate-600 dark:text-slate-400 px-1.5 py-0 border border-slate-200 dark:border-slate-800"
                      >
                        {inst.exchange}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-400 font-mono">
                    <div className="flex flex-col gap-0.5">
                      {getIdentifier(inst) !== '—' && (
                        <span>{getIdentifier(inst)}</span>
                      )}
                      {inst.isin && (
                        <span className="text-2xs text-slate-400">
                          ISIN: {inst.isin}
                        </span>
                      )}
                      {getIdentifier(inst) === '—' && !inst.isin && (
                        <span>—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 text-right text-xs tabular-nums whitespace-nowrap">
                    {inst.lastPrice != null ? (
                      <div>
                        <span className="font-medium text-xs text-slate-900 dark:text-slate-100">
                          {formatMoney(inst.lastPrice)}
                        </span>
                        {inst.lastPriceAsOf && (
                          <span className="text-2xs text-slate-400 block whitespace-nowrap">
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
  );
}
