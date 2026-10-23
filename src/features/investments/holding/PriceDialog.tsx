'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { DateField, Dialog, DialogBody, DialogContent, showToast } from '@/components/ds';
import { AmountField } from '@/components/organisms';
import { amountExpressionProps, resolveAmountExpression } from '@/lib/amountExpression';
import { getErrorMessage } from '@/lib/api/errorMessage';

import { usePriceMutations } from '../usePriceMutations';
import type { PriceRowModel } from './holdingModel';

const FORM_ID = 'holding-price-form';

export type PriceDialogTarget =
  /** Change the amount of one of the user's manual prices. */
  | { kind: 'edit'; row: PriceRowModel }
  /** Set a manual price (the LTP "override"). */
  | { kind: 'override'; today: string; price: number | null };

export interface PriceDialogProps {
  instrumentId: string;
  name: string;
  target: PriceDialogTarget;
  onClose: () => void;
}

/** A manual price: its date and amount. An existing price keeps its date (only the amount can change). */
export function PriceDialog({ instrumentId, name, target, onClose }: PriceDialogProps) {
  const router = useRouter();
  const { setPrice, updatePrice } = usePriceMutations(instrumentId);
  const editing = target.kind === 'edit';
  const [date, setDate] = React.useState(editing ? target.row.asOf : target.today);
  const [amount, setAmount] = React.useState(editing ? String(target.row.close) : target.price != null ? String(target.price) : '');
  const [error, setError] = React.useState<string | undefined>();
  const submitting = setPrice.isPending || updatePrice.isPending;

  const submit = async () => {
    const resolved = resolveAmountExpression(amount);
    setAmount(resolved);
    const price = Number(resolved);
    if (!resolved || !Number.isFinite(price) || price <= 0) {
      setError('Enter a price above zero.');
      return;
    }
    try {
      if (target.kind === 'edit') {
        await updatePrice.mutateAsync({ priceId: target.row.id!, price });
        showToast('Price updated');
      } else {
        await setPrice.mutateAsync({ price, asOf: date });
        showToast(`Price updated for ${name}`);
      }
      router.refresh();
      onClose();
    } catch (e) {
      showToast(getErrorMessage(e, 'Failed to update the price'), { tone: 'danger' });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent
        size="sm"
        title={editing ? 'Edit manual price' : 'Set manual price'}
        description={name}
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: submitting }}
        primary={{ label: 'Save price', type: 'submit', form: FORM_ID, loading: submitting }}
      >
        <DialogBody>
          <form
            id={FORM_ID}
            noValidate
            autoComplete="off"
            className="flex flex-col gap-space-16"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <DateField
              label="As of"
              today={editing ? target.row.asOf : target.today}
              value={date}
              disabled={editing}
              onValueChange={(v) => setDate(typeof v === 'string' ? v : '')}
            />
            <AmountField
              label="Price"
              prefix="₹"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              {...amountExpressionProps(amount, (v) => {
                setAmount(v);
                setError(undefined);
              })}
              error={error}
            />
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
