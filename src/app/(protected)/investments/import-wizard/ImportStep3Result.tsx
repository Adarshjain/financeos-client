'use client';

import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { ImportCommitResult } from '@/lib/types';

interface ImportStep3ResultProps {
  commitResult: ImportCommitResult;
  selectedBrokerName: string;
  onDone: () => void;
}

export function ImportStep3Result({
  commitResult,
  selectedBrokerName,
  onDone,
}: ImportStep3ResultProps) {
  return (
    <div className="space-y-2 pb-6 text-center mx-4">
      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Broker Import Reconciliation Complete!
        </h3>
        <p className="text-xs text-slate-500">
          Successfully processed import for{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedBrokerName}</span>.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300">
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Committed</div>
          <div className="text-lg font-bold">{commitResult.committed}</div>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
          <div className="text-[10px] text-slate-500">Skipped</div>
          <div className="text-lg font-bold">{commitResult.skipped}</div>
        </div>
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300">
          <div className="text-[10px] text-red-600 dark:text-red-400">Failed</div>
          <div className="text-lg font-bold">{commitResult.failed?.length || 0}</div>
        </div>
      </div>

      {/* Failed Details List */}
      {commitResult.failed && commitResult.failed.length > 0 && (
        <div className="text-left p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-xs">
          <div className="font-bold text-red-800 dark:text-red-300 mb-1 flex items-center gap-1.5">
            <span>Failed Executions ({commitResult.failed.length})</span>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1 text-[11px] font-mono text-red-700 dark:text-red-400 pr-1">
            {commitResult.failed.map((f, i) => (
              <div key={i} className="truncate">
                #{f.rowIndex} {f.scrip ? `${f.scrip} — ` : ''}{f.reason}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skipped Details List */}
      {commitResult.skippedItems && commitResult.skippedItems.length > 0 && (
        <div className="text-left p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
            <span>Skipped Executions ({commitResult.skippedItems.length})</span>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1 text-[11px] font-mono text-slate-600 dark:text-slate-400 pr-1">
            {commitResult.skippedItems.map((s, i) => (
              <div key={i} className="truncate">
                #{s.rowIndex} {s.scrip ? `${s.scrip} — ` : ''}{s.reason}
              </div>
            ))}
          </div>
        </div>
      )}

      <DialogFooter className="justify-center pt-2">
        <Button
          type="button"
          size="sm"
          onClick={onDone}
          className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
        >
          Done & View Portfolio
        </Button>
      </DialogFooter>
    </div>
  );
}
