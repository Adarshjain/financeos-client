'use client';

import { Edit, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CorporateAction } from '@/lib/api/types';
import { Instrument } from '@/lib/types';
import { formatDate } from '@/lib/utils';

import { CorporateActionKind } from '../corporate-actions/useCorporateActionsDialog';

export function getActionBadge(type: CorporateActionKind) {
  let colorClass =
    'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800';
  let label = type.toUpperCase();

  if (type === 'split') {
    colorClass =
      'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    label = 'SPLIT';
  } else if (type === 'bonus') {
    colorClass =
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    label = 'BONUS';
  } else if (type === 'demerger') {
    colorClass =
      'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    label = 'DEMERGER';
  } else if (type === 'merger') {
    colorClass =
      'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300 border-pink-200 dark:border-pink-800';
    label = 'MERGER';
  }

  return (
    <Badge
      variant="outline"
      className={`font-bold text-2xs uppercase px-2 py-0.5 ${colorClass}`}
    >
      {label}
    </Badge>
  );
}

interface CorporateActionsMobileCardsProps {
  sortedActions: CorporateAction[];
  instrumentMap: Map<string, Instrument>;
  openEditDialog: (act: CorporateAction) => void;
  handleDelete: (instrumentId: string, actionId: string) => Promise<void>;
  deletingId: string | null;
}

export function CorporateActionsMobileCards({
  sortedActions,
  instrumentMap,
  openEditDialog,
  handleDelete,
  deletingId,
}: CorporateActionsMobileCardsProps) {
  return (
    <div className="block md:hidden grid grid-cols-1 gap-2 sm:gap-4">
      {sortedActions.map((act) => {
        const inst = instrumentMap.get(act.instrumentId);
        const instName = act.instrumentName || inst?.name || 'Instrument';
        const instSymbol = act.instrumentSymbol || inst?.symbol;

        return (
          <Card
            key={act.id}
            className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-purple-200 dark:hover:border-purple-900/60 transition-all duration-200 overflow-hidden"
          >
            {/* Header Row */}
            <CardHeader className="p-3 sm:p-3.5 pb-2 flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800/60 space-y-0">
              <div className="flex items-center gap-1.5 min-w-0">
                {getActionBadge(act.type)}
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  Ratio: {act.ratioFrom} → {act.ratioTo}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
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
            </CardHeader>

            <CardContent className="p-3 sm:p-3.5 space-y-2">
              {/* Instrument Info Row */}
              <div>
                <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                  {instName} {instSymbol ? `(${instSymbol})` : ''}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Ex-Date:{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                    {formatDate(act.exDate)}
                  </span>
                </div>
              </div>

              {/* Demerger / Merger Banner */}
              {(act.type === 'demerger' || act.type === 'merger') && (
                <div className="text-xs font-medium bg-slate-50 dark:bg-slate-950/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800/50">
                  {act.type === 'demerger' ? (
                    <>
                      Child:{' '}
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {act.targetInstrumentName || 'Child Instrument'}
                      </span>{' '}
                      {act.targetInstrumentSymbol
                        ? `(${act.targetInstrumentSymbol})`
                        : ''}{' '}
                      • Cost Alloc:{' '}
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {act.costAllocationPct}%
                      </span>
                    </>
                  ) : (
                    <>
                      Merged into:{' '}
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {act.targetInstrumentName || 'Acquirer Instrument'}
                      </span>{' '}
                      {act.targetInstrumentSymbol
                        ? `(${act.targetInstrumentSymbol})`
                        : ''}
                    </>
                  )}
                </div>
              )}

              {/* Notes Row */}
              {act.notes && (
                <p className="text-2xs text-slate-500 dark:text-slate-400 italic">
                  &quot;{act.notes}&quot;
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
