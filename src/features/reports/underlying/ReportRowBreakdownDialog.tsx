'use client';

// A row breakdown on its own (a widget's account balance, a holding…), the Dinero version of the Legacy
// RowBreakdownDialog: how one row's value is made up — header and total, the arithmetic as steps, then each
// section as a server-paged, server-sorted table. A section's rows open a nested breakdown on top (Back returns
// a level; the root has no Back) or, with `onOpenTransaction`, a transaction. The dialog is open while it is
// mounted, like ReportUnderlyingDialog; each opening starts at the root.

import { Dialog } from '@/components/ds/Dialog/Dialog';

import { BreakdownFrameView } from './BreakdownFrameView';
import { useBreakdownStack } from './useBreakdownStack';

export interface ReportRowBreakdownDialogProps {
  /** The datasource whose row is broken down (e.g. `net_worth`, `positions`). */
  datasource: string;
  /** The row's id within that datasource. */
  rowId: string;
  /** Dialog title (the widget's or the row's name). */
  title: string;
  /** A transaction row was pressed; without it transaction rows do nothing. */
  onOpenTransaction?: (id: string) => void;
  onClose: () => void;
}

export function ReportRowBreakdownDialog({ datasource, rowId, title, onOpenTransaction, onClose }: ReportRowBreakdownDialogProps) {
  const nav = useBreakdownStack([{ datasource, rowId }]);
  // The root frame is never popped (it has no Back), so `top` is always set.
  const top = nav.top ?? { datasource, rowId };
  const nested = nav.stack.length > 1;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content size="xl" title={title} secondary={{ label: 'Close', onSelect: onClose }}>
        <Dialog.Body>
          <BreakdownFrameView
            key={`${nav.stack.length}:${top.rowId}`}
            datasource={top.datasource}
            rowId={top.rowId}
            onBack={nested ? nav.pop : undefined}
            onOpenTransaction={onOpenTransaction ?? (() => undefined)}
            onOpenBreakdown={nav.push}
            transactionsOpen={onOpenTransaction !== undefined}
          />
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
