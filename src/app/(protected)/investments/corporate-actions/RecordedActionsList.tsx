'use client';

import { Edit, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CorporateAction } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface RecordedActionsListProps {
  actions: CorporateAction[];
  isLoading: boolean;
  editingActionId: string | null;
  deletingId: string | null;
  onEditClick: (act: CorporateAction) => void;
  onDeleteClick: (id: string) => void;
}

export function RecordedActionsList({
  actions,
  isLoading,
  editingActionId,
  deletingId,
  onEditClick,
  onDeleteClick,
}: RecordedActionsListProps) {
  return (
    <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
        Recorded Actions
      </h4>
      {isLoading ? (
        <div className="text-xs text-slate-400 py-2">Loading...</div>
      ) : actions.length === 0 ? (
        <div className="text-xs text-slate-400 py-2 italic">
          No corporate actions recorded yet for this instrument.
        </div>
      ) : (
        <div className="space-y-2">
          {actions.map((act) => (
            <div
              key={act.id}
              className={`p-2.5 rounded-md border flex items-center justify-between text-xs gap-2 ${
                editingActionId === act.id
                  ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="font-semibold flex items-center gap-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className="text-2xs uppercase px-1 py-0 font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 shrink-0"
                  >
                    {act.type}
                  </Badge>
                  <span className="break-words">
                    Ratio: {act.ratioFrom} → {act.ratioTo}
                  </span>
                </div>
                {act.type === 'demerger' && (
                  <div className="text-xs font-medium text-purple-700 dark:text-purple-300 break-words">
                    Child: {act.targetInstrumentName || 'Target'}{' '}
                    {act.targetInstrumentSymbol
                      ? `(${act.targetInstrumentSymbol})`
                      : ''}{' '}
                    • Cost Alloc: {act.costAllocationPct}%
                    {act.fractionalCashInLieu !== undefined &&
                    act.fractionalCashInLieu !== null
                      ? ` • cash-in-lieu ₹${act.fractionalCashInLieu}`
                      : ''}
                  </div>
                )}
                {act.type === 'merger' && (
                  <div className="text-xs font-medium text-purple-700 dark:text-purple-300 break-words">
                    Merged into {act.targetInstrumentName || 'Acquirer'}{' '}
                    {act.targetInstrumentSymbol
                      ? `(${act.targetInstrumentSymbol})`
                      : ''}{' '}
                    • swap {act.ratioFrom}:{act.ratioTo}
                    {act.fractionalCashInLieu !== undefined &&
                    act.fractionalCashInLieu !== null
                      ? ` • cash-in-lieu ₹${act.fractionalCashInLieu}`
                      : ''}
                  </div>
                )}
                <div className="text-2xs text-slate-500 break-words">
                  Ex-Date: {formatDate(act.exDate)}{' '}
                  {act.notes ? `• ${act.notes}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  size="icon-xs"
                  onClick={() => onEditClick(act)}
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost-destructive"
                  size="icon-xs"
                  onClick={() => onDeleteClick(act.id)}
                  disabled={deletingId === act.id}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
