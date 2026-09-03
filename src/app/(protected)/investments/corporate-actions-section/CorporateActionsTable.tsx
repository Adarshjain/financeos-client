'use client';

import { Edit, Trash2 } from 'lucide-react';

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
import { CorporateAction } from '@/lib/api/types';
import { Instrument } from '@/lib/types';
import { formatDate } from '@/lib/utils';

import { getActionBadge } from './CorporateActionsMobileCards';

interface CorporateActionsTableProps {
  sortedActions: CorporateAction[];
  instrumentMap: Map<string, Instrument>;
  openEditDialog: (act: CorporateAction) => void;
  handleDelete: (instrumentId: string, actionId: string) => Promise<void>;
  deletingId: string | null;
}

export function CorporateActionsTable({
  sortedActions,
  instrumentMap,
  openEditDialog,
  handleDelete,
  deletingId,
}: CorporateActionsTableProps) {
  return (
    <Card className="hidden md:block bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                <TableHead className="text-xs font-medium">
                  Instrument
                </TableHead>
                <TableHead className="text-xs font-medium">
                  Action Type
                </TableHead>
                <TableHead className="text-xs font-medium">Ratio</TableHead>
                <TableHead className="text-xs font-medium whitespace-nowrap">
                  Ex-Date
                </TableHead>
                <TableHead className="text-xs font-medium">Notes</TableHead>
                <TableHead className="text-right text-xs font-medium"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedActions.map((act) => {
                const inst = instrumentMap.get(act.instrumentId);
                const instName =
                  act.instrumentName || inst?.name || 'Instrument';
                const instSymbol = act.instrumentSymbol || inst?.symbol;

                return (
                  <TableRow
                    key={act.id}
                    className="border-slate-100 dark:border-slate-800/60"
                  >
                    <TableCell className="py-2.5">
                      <div className="font-medium text-xs text-slate-900 dark:text-slate-100">
                        {instName}
                      </div>
                      {instSymbol && (
                        <div className="text-2xs text-slate-400 font-mono">
                          {instSymbol}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs whitespace-nowrap">
                      {getActionBadge(act.type)}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs font-normal text-slate-900 dark:text-slate-100 tabular-nums whitespace-nowrap">
                      {act.ratioFrom} → {act.ratioTo}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap">
                      {formatDate(act.exDate)}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-400">
                      {(act.type === 'demerger' || act.type === 'merger') && (
                        <div className="text-xs font-normal text-slate-700 dark:text-slate-300">
                          {act.type === 'demerger' ? (
                            <>
                              Child:{' '}
                              <span className="font-medium">
                                {act.targetInstrumentName || 'Child Instrument'}
                              </span>{' '}
                              {act.targetInstrumentSymbol
                                ? `(${act.targetInstrumentSymbol})`
                                : ''}{' '}
                              • Alloc:{' '}
                              <span className="font-medium">
                                {act.costAllocationPct}%
                              </span>
                            </>
                          ) : (
                            <>
                              Merged into:{' '}
                              <span className="font-medium">
                                {act.targetInstrumentName ||
                                  'Acquirer Instrument'}
                              </span>{' '}
                              {act.targetInstrumentSymbol
                                ? `(${act.targetInstrumentSymbol})`
                                : ''}
                            </>
                          )}
                        </div>
                      )}
                      {act.notes && (
                        <div className="text-2xs text-slate-500 dark:text-slate-400 italic">
                          &quot;{act.notes}&quot;
                        </div>
                      )}
                      {!act.notes &&
                        act.type !== 'demerger' &&
                        act.type !== 'merger' &&
                        '—'}
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEditDialog(act)}
                          className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                          title="Edit Corporate Action"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost-destructive"
                          size="icon-xs"
                          onClick={() => handleDelete(act.instrumentId, act.id)}
                          disabled={deletingId === act.id}
                          title="Delete Corporate Action"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
