'use client';

import { Bell, Receipt } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { BillPossiblePayment, CardBillResponse, MarkBillPaidRequest, UpdateBillDetailsRequest } from '@/lib/api/types';
import { useBillMutations, useBills } from '@/lib/query/hooks/useBills';

import { BillDetailsDialog } from './BillDetailsDialog';
import { BillRow } from './BillRow';
import { countActionable } from './bills.helpers';
import { MarkPaidDialog } from './MarkPaidDialog';

interface BillsDueCardProps {
  initialBills?: CardBillResponse[];
}

/**
 * The dashboard's "Bills due" card: every open credit card's current bill, computed on read by
 * the same service that drives the push reminders, so the two never disagree. Renders nothing
 * when there are no card statements at all (no card, no noise).
 */
export function BillsDueCard({ initialBills }: BillsDueCardProps) {
  const { data: bills = [], isLoading, error } = useBills(initialBills);
  const { markPaid, unmarkPaid, updateDetails } = useBillMutations();
  const searchParams = useSearchParams();
  const highlightId = searchParams?.get('bill') ?? null;

  const [paidTarget, setPaidTarget] = React.useState<CardBillResponse | null>(null);
  const [paidPrefill, setPaidPrefill] = React.useState<{ amount: number; paidOn: string } | null>(null);
  const [detailsTarget, setDetailsTarget] = React.useState<CardBillResponse | null>(null);

  const busy = markPaid.isPending || unmarkPaid.isPending || updateDetails.isPending;

  React.useEffect(() => {
    if (!highlightId) return;
    const el = document.querySelector(`[data-statement-id="${highlightId}"]`);
    el?.scrollIntoView({ block: 'center' });
  }, [highlightId, bills.length]);

  if (!isLoading && !error && bills.length === 0) {
    return null;
  }

  const openMarkPaid = (bill: CardBillResponse) => {
    setPaidPrefill(null);
    setPaidTarget(bill);
  };

  const confirmPayment = (bill: CardBillResponse, payment: BillPossiblePayment) => {
    setPaidPrefill({ amount: payment.amount ?? 0, paidOn: payment.date ?? '' });
    setPaidTarget(bill);
  };

  const submitMarkPaid = async (body: MarkBillPaidRequest) => {
    if (!paidTarget) return;
    try {
      const bill = await markPaid.mutateAsync({ statementId: paidTarget.statementId, body });
      setPaidTarget(null);
      toast.success(bill.status === 'PAID' ? 'Bill marked as paid' : 'Partial payment recorded');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not mark the bill as paid'));
    }
  };

  const submitUnmark = async (bill: CardBillResponse) => {
    try {
      await unmarkPaid.mutateAsync(bill.statementId);
      toast.success('Payment mark removed');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not undo the payment mark'));
    }
  };

  const submitDetails = async (body: UpdateBillDetailsRequest) => {
    if (!detailsTarget) return;
    try {
      await updateDetails.mutateAsync({ statementId: detailsTarget.statementId, body });
      setDetailsTarget(null);
      toast.success('Statement details saved');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not save the statement details'));
    }
  };

  const actionable = countActionable(bills);

  return (
    <Card className="rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden" data-testid="bills-due-card">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Receipt className="h-4 w-4 text-amber-500" />
          Bills due
          {actionable > 0 && (
            <span className="text-2xs font-semibold text-slate-500 dark:text-slate-400">({actionable})</span>
          )}
        </CardTitle>
        <Button asChild size="icon-xs" variant="ghost" aria-label="Notification settings">
          <Link href="/settings/notifications">
            <Bell className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="px-4 py-4 text-xs text-slate-400">Loading bills…</p>
        ) : error ? (
          <p className="px-4 py-4 text-xs text-rose-600 dark:text-rose-400">
            Couldn&apos;t load bills: {getErrorMessage(error, 'request failed')}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {bills.map((bill) => (
              <BillRow
                key={bill.statementId}
                bill={bill}
                highlighted={bill.statementId === highlightId}
                busy={busy}
                onMarkPaid={openMarkPaid}
                onUnmarkPaid={submitUnmark}
                onSetDetails={setDetailsTarget}
                onConfirmPayment={confirmPayment}
              />
            ))}
          </ul>
        )}
      </CardContent>

      <MarkPaidDialog
        open={paidTarget !== null}
        onOpenChange={(open) => !open && setPaidTarget(null)}
        bill={paidTarget}
        submitting={markPaid.isPending}
        onSubmit={submitMarkPaid}
        prefill={paidPrefill}
      />
      <BillDetailsDialog
        open={detailsTarget !== null}
        onOpenChange={(open) => !open && setDetailsTarget(null)}
        bill={detailsTarget}
        submitting={updateDetails.isPending}
        onSubmit={submitDetails}
      />
    </Card>
  );
}
