'use client';

import { useMemo, useState } from 'react';

import { Card, Checkbox, Dialog, DialogBody, DialogContent, ListRow } from '@/components/ds';

import { approveTitle, type ClearableReason, countReasons } from './reviewHelpers';
import { ReviewSummaryDialog } from './ReviewSummaryDialog';
import { type ReviewTxn, useApproveTransactions } from './useApproveTransactions';

export interface ApproveDialogProps {
  /** The transactions to approve: the selection, or the one row whose reasons are several. */
  transactions: ReviewTxn[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the request went through (clean or with a summary), once the dialog has closed. */
  onDone?: () => void;
}

/**
 * Approve dialog (board D/P-transactions-approve). One checkbox per reason; the reasons the transactions carry
 * start ticked. Approving clears the ticked reasons on every row that has one. Skipped or failed rows
 * open the summary, so this component also renders it.
 */
export function ApproveDialog({ transactions, open, onOpenChange, onDone }: ApproveDialogProps) {
  const { approve, isPending, summary, closeSummary } = useApproveTransactions();
  const rows = useMemo(() => countReasons(transactions), [transactions]);
  const present = useMemo(() => rows.filter((r) => r.count > 0).map((r) => r.reason), [rows]);
  // Null until the person ticks something, so the present reasons are the default; reset on every open.
  const [chosen, setChosen] = useState<ClearableReason[] | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setChosen(null);
  }
  const ticked = chosen ?? present;

  const toggle = (reason: ClearableReason, on: boolean) =>
    setChosen(on ? [...ticked, reason] : ticked.filter((r) => r !== reason));

  const submit = async () => {
    const ok = await approve(transactions, ticked);
    if (!ok) return;
    onOpenChange(false);
    onDone?.();
  };

  const total = transactions.length;
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          size="sm"
          title={approveTitle(total)}
          description="Tick the reasons to clear. Each transaction is marked manually reviewed for those; any other flag it carries stays."
          secondary={{ label: 'Cancel', onSelect: () => onOpenChange(false) }}
          primary={{
            label: `Approve ${total}`,
            onSelect: () => void submit(),
            disabled: ticked.length === 0 || total === 0,
            loading: isPending,
          }}
        >
          <DialogBody>
            <Card>
              {rows.map((r) => {
                const id = `approve-reason-${r.reason}`;
                return (
                  <ListRow
                    key={r.reason}
                    wrap
                    leading={
                      <Checkbox
                        id={id}
                        checked={ticked.includes(r.reason)}
                        onCheckedChange={(on) => toggle(r.reason, on === true)}
                      />
                    }
                    title={<label htmlFor={id}>{r.label}</label>}
                    subtitle={`${r.hint} · ${r.count} of ${total}`}
                  />
                );
              })}
            </Card>
          </DialogBody>
        </DialogContent>
      </Dialog>
      <ReviewSummaryDialog summary={summary} onClose={closeSummary} />
    </>
  );
}
