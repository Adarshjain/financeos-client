'use client';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ReviewBatchSummaryDialogProps {
  summaryData: {
    succeededCount: number;
    skippedCount: number;
    failures: { description: string; reason: string }[];
    skips: string[];
  } | null;
  onClose: () => void;
}

export function ReviewBatchSummaryDialog({
  summaryData,
  onClose,
}: ReviewBatchSummaryDialogProps) {
  return (
    <Dialog open={summaryData !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">Batch Action Summary</DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            The batch operation completed with the following results:
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-2">
          {/* Counts */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
              <span className="block text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {summaryData?.succeededCount || 0}
              </span>
              <span className="text-2xs text-emerald-700 dark:text-emerald-500 font-bold uppercase tracking-wider">
                Succeeded
              </span>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/30">
              <span className="block text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {summaryData?.skippedCount || 0}
              </span>
              <span className="text-2xs text-amber-700 dark:text-amber-500 font-bold uppercase tracking-wider">
                Skipped
              </span>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/30">
              <span className="block text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                {summaryData?.failures?.length || 0}
              </span>
              <span className="text-2xs text-rose-700 dark:text-rose-500 font-bold uppercase tracking-wider">
                Failed
              </span>
            </div>
          </div>

          {/* Skips list */}
          {summaryData && summaryData.skips && summaryData.skips.length > 0 && (
            <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Skipped Rows (no reasons matched):
              </span>
              <ul className="text-xs space-y-1 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                {summaryData.skips.map((desc, idx) => (
                  <li key={idx} className="truncate text-slate-600 dark:text-slate-400">
                    • {desc}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Failures list */}
          {summaryData && summaryData.failures && summaryData.failures.length > 0 && (
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Failed Rows:
              </span>
              <ul className="text-xs space-y-2 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                {summaryData.failures.map((f, idx) => (
                  <li key={idx} className="text-slate-700 dark:text-slate-300">
                    <span className="font-semibold block truncate text-rose-600 dark:text-rose-400">
                      • {f.description}
                    </span>
                    <span className="text-2xs text-slate-400 pl-3">Reason: {f.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </DialogBody>
        <DialogFooter
          primaryAction={{
            label: 'Close',
            onClick: onClose,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
