'use client';

// A row breakdown on its own (a widget's account balance, a holding…), without
// the KPI listing around it: the same frame stack as "View underlying data" —
// nested breakdowns open on top and Back returns a level; the root has no Back.
// Transaction rows open the transaction detail. Each opening starts at the
// root (the content unmounts on close).

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { LazyUnderlyingTransactionDialog } from './LazyUnderlyingTransactionDialog';
import { RowBreakdownView } from './RowBreakdownView';
import { useBreakdownStack } from './useBreakdownStack';

export interface RowBreakdownDialogProps {
  /** The datasource whose row is broken down (e.g. `net_worth`, `positions`). */
  datasource: string;
  /** The row's id within that datasource. */
  rowId: string;
  /** Dialog title (the widget's or the row's name). */
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RowBreakdownDialog({ datasource, rowId, title, open, onOpenChange }: RowBreakdownDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl" aria-describedby={undefined}>
        {open && (
          <BreakdownContent datasource={datasource} rowId={rowId} title={title} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BreakdownContent({
  datasource,
  rowId,
  title,
  onClose,
}: Pick<RowBreakdownDialogProps, 'datasource' | 'rowId' | 'title'> & { onClose: () => void }) {
  const nav = useBreakdownStack([{ datasource, rowId }]);
  // The root frame is never popped (it has no Back), so `top` is always set.
  const top = nav.top ?? { datasource, rowId };
  const nested = nav.stack.length > 1;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <RowBreakdownView
          key={`${nav.stack.length}:${top.rowId}`}
          datasource={top.datasource}
          rowId={top.rowId}
          onBack={nested ? nav.pop : undefined}
          onOpenTransaction={nav.openTransaction}
          onOpenBreakdown={nav.push}
        />
      </DialogBody>
      <DialogFooter primaryAction={{ label: 'Close', variant: 'outline', onClick: onClose }} />
      <LazyUnderlyingTransactionDialog transactionId={nav.transactionId} onClose={nav.closeTransaction} />
    </>
  );
}
