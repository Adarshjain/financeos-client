'use client';

import React from 'react';

import { DateField } from '@/components/ds/DateField/DateField';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { SegmentedControl } from '@/components/ds/SegmentedControl/SegmentedControl';
import { Select, type SelectOption } from '@/components/ds/Select/Select';
import { showToast } from '@/components/ds/Toast/Toast';
import { AmountField } from '@/components/organisms/AmountField/AmountField';
import { isAccountClosed } from '@/lib/account.types';
import { amountExpressionProps, resolveAmountExpression } from '@/lib/amountExpression';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { MarkBillPaidRequest, PaymentCandidateResponse } from '@/lib/api/types';
import { todayInAppZone } from '@/lib/date-range';
import { formatDate, formatMoney } from '@/lib/format';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { useBillMutations } from '@/lib/query/hooks/useBills';
import { usePaymentCandidates } from '@/lib/query/hooks/usePaymentCandidates';
import { AccountType } from '@/lib/types';
import { useAppRouter } from '@/lib/useAppRouter';
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from '@/lib/useDebouncedValue';

const FORM_ID = 'bill-mark-paid-form';

export interface MarkPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statementId: string;
  /** The card's name, for the subtitle. */
  cardName: string;
  /** What is left to pay; null when the statement carries no amount. */
  remaining: number | null;
  /** The bill was marked paid, or that was undone: what the caller holds about it is stale. */
  onMarked?: () => void;
}

type Mode = 'full' | 'part';

/** Wall clock in ms; a function so the render-time open stamp reads as intentional. */
const nowMs = () => Date.now();

const NONE = 'none';
const EXTERNAL = 'external';
const candidateValue = (c: PaymentCandidateResponse) => `tx:${c.transactionId}`;
const accountValue = (id: string) => `acct:${id}`;

const MODES = [
  { value: 'full', label: 'Paid in full' },
  { value: 'part', label: 'Part payment' },
] as const;

/**
 * Marks a statement paid by hand: in full by default, or a part payment. The paid date defaults to
 * today and can never be in the future (the server rejects it too). Success is a Toast with Undo.
 */
export function MarkPaidDialog({
  open,
  onOpenChange,
  statementId,
  cardName,
  remaining,
  onMarked,
}: MarkPaidDialogProps) {
  const router = useAppRouter();
  const { markPaid, unmarkPaid } = useBillMutations();
  const today = todayInAppZone();
  const [mode, setMode] = React.useState<Mode>('full');
  const [amount, setAmount] = React.useState('');
  const [paidOn, setPaidOn] = React.useState(today);
  const [amountError, setAmountError] = React.useState<string | null>(null);
  const [dateError, setDateError] = React.useState<string | null>(null);
  // What the user picked in "Paid from"; null until they pick, so the default can follow the candidates.
  const [picked, setPicked] = React.useState<string | null>(null);

  const debouncedAmount = useDebouncedValue(amount, SEARCH_DEBOUNCE_MS);
  const partAmount = mode === 'part' ? Number(resolveAmountExpression(debouncedAmount)) : null;
  const partAmountValid = partAmount != null && Number.isFinite(partAmount) && partAmount > 0;
  const lookupWanted = open && (mode === 'full' || partAmountValid);
  // Not while submitting: the refetch after the mark would come back empty and unlock the fields.
  const candidatesQuery = usePaymentCandidates(
    statementId,
    partAmountValid ? partAmount : null,
    lookupWanted && !markPaid.isPending,
  );
  // The dialog stays mounted, so a query keeps the last open's answer: only data fetched since this open counts.
  const [openedAt, setOpenedAt] = React.useState(0);
  const [wasOpen, setWasOpen] = React.useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setOpenedAt(nowMs());
  }
  const fresh = (candidatesQuery.dataUpdatedAt ?? 0) >= openedAt;
  const candidates = React.useMemo(
    () => (lookupWanted && fresh && Array.isArray(candidatesQuery.data) ? candidatesQuery.data : []),
    [lookupWanted, fresh, candidatesQuery.data],
  );
  const accountsQuery = useAccounts(undefined, { enabled: open });
  const payFromAccounts = React.useMemo(
    () =>
      (Array.isArray(accountsQuery.data) ? accountsQuery.data : []).filter(
        (a) => (a.type === AccountType.BANK_ACCOUNT || a.type === AccountType.GENERIC) && !isAccountClosed(a),
      ),
    [accountsQuery.data],
  );

  const options = React.useMemo<SelectOption[]>(
    () => [
      ...candidates.map((c) => ({
        value: candidateValue(c),
        label: `${c.accountName} · ${formatDate(c.date, 'list')} · ${formatMoney(c.amount, { decimals: 'exact' })}`,
        description: c.description ?? undefined,
      })),
      ...payFromAccounts.map((a) => ({
        value: accountValue(a.id),
        label: a.name,
        description: 'Creates the bank payment too',
      })),
      { value: EXTERNAL, label: 'An account not in FinanceOS', description: 'Adds the card payment only' },
      { value: NONE, label: "Don't add a transaction" },
    ],
    [candidates, payFromAccounts],
  );
  // One found debit is preselected; a pick that no longer exists (the amount changed) falls back to the default.
  const defaultChoice = candidates.length === 1 ? candidateValue(candidates[0]) : NONE;
  const choice = picked != null && options.some((o) => o.value === picked) ? picked : defaultChoice;
  const chosenCandidate = candidates.find((c) => candidateValue(c) === choice) ?? null;

  React.useEffect(() => {
    if (!open) return;
    setMode('full');
    setPicked(null);
    setAmount('');
    setPaidOn(todayInAppZone());
    setAmountError(null);
    setDateError(null);
  }, [open]);

  const undo = async () => {
    try {
      await unmarkPaid.mutateAsync(statementId);
      showToast('Payment mark removed');
      router.refresh();
      onMarked?.();
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't undo the payment. Try again."), { tone: 'danger' });
    }
  };

  const submit = async () => {
    const body: MarkBillPaidRequest = {};
    let valid = true;
    if (chosenCandidate) {
      // The debit decides the amount and the date.
      body.payment = { mode: 'EXISTING', fromTransactionId: chosenCandidate.transactionId };
      await send(body);
      return;
    }
    if (mode === 'part') {
      const resolvedAmount = resolveAmountExpression(amount);
      if (resolvedAmount !== amount) setAmount(resolvedAmount);
      const parsed = Number(resolvedAmount);
      if (!resolvedAmount || !Number.isFinite(parsed) || parsed <= 0) {
        setAmountError('Enter the amount you paid');
        valid = false;
      } else {
        setAmountError(null);
        body.amount = parsed;
      }
    }
    if (paidOn && paidOn > today) {
      setDateError('Enter a paid date that is not in the future.');
      valid = false;
    } else {
      setDateError(null);
      if (paidOn) body.paidOn = paidOn;
    }
    if (!valid) return;
    if (choice === EXTERNAL) body.payment = { mode: 'NEW' };
    else if (choice.startsWith('acct:')) body.payment = { mode: 'NEW', fromAccountId: choice.slice(5) };
    await send(body);
  };

  const send = async (body: MarkBillPaidRequest) => {
    try {
      await markPaid.mutateAsync({ statementId, body });
      onOpenChange(false);
      showToast(mode === 'part' && !chosenCandidate ? 'Partial payment recorded' : 'Bill marked as paid', {
        action: { label: 'Undo', onSelect: undo },
      });
      router.refresh();
      onMarked?.();
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't mark the bill paid. Try again."), { tone: 'danger' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        size="sm"
        title="Mark bill as paid"
        description={
          remaining != null ? `${cardName} · ${formatMoney(remaining, { decimals: 'exact' })} outstanding` : cardName
        }
        secondary={{
          label: 'Cancel',
          onSelect: () => onOpenChange(false),
          disabled: markPaid.isPending,
        }}
        primary={{ label: 'Mark paid', type: 'submit', form: FORM_ID, loading: markPaid.isPending }}
      >
        <Dialog.Body>
          <form
            id={FORM_ID}
            className="flex flex-col gap-space-8 desk:gap-space-12"
            onSubmit={(e) => {
              e.preventDefault();
              if (!markPaid.isPending) void submit();
            }}
          >
            <SegmentedControl
              fullWidth
              aria-label="Payment type"
              options={[...MODES]}
              value={mode}
              onValueChange={(v) => setMode(v as Mode)}
            />
            {chosenCandidate ? (
              <AmountField
                label="Amount paid"
                prefix="₹"
                inputMode="decimal"
                value={String(chosenCandidate.amount)}
                disabled
              />
            ) : mode === 'part' ? (
              <AmountField
                label="Amount paid"
                prefix="₹"
                inputMode="decimal"
                value={amount}
                {...amountExpressionProps(amount, setAmount)}
                error={amountError ?? undefined}
              />
            ) : null}
            <DateField
              label="Paid on"
              today={today}
              maxDate={today}
              value={chosenCandidate ? chosenCandidate.date : paidOn}
              onValueChange={(v) => setPaidOn(typeof v === 'string' ? v : '')}
              disabled={Boolean(chosenCandidate)}
              error={chosenCandidate ? undefined : (dateError ?? undefined)}
            />
            <Select
              label="Paid from"
              options={options}
              value={choice}
              onValueChange={(v) => setPicked(typeof v === 'string' ? v : null)}
            />
          </form>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
