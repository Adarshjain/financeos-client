'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { DateField, Dialog, showToast } from '@/components/ds';
import { AmountField } from '@/components/organisms';
import { ActionError } from '@/lib/actionResult';
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
  /** Called after the price is saved, before the dialog closes. */
  onSaved?: () => void;
  onClose: () => void;
}

/** A manual price: its date and amount. Both can be changed on an existing price; a date already taken by another of your prices is shown on the date field. */
export function PriceDialog({ instrumentId, name, target, onSaved, onClose }: PriceDialogProps) {
  const router = useRouter();
  const { setPrice, updatePrice } = usePriceMutations(instrumentId);
  const editing = target.kind === 'edit';
  const [date, setDate] = React.useState(editing ? target.row.asOf : target.today);
  const [amount, setAmount] = React.useState(editing ? String(target.row.close) : target.price != null ? String(target.price) : '');
  const [error, setError] = React.useState<string | undefined>();
  const [dateError, setDateError] = React.useState<string | undefined>();
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
        await updatePrice.mutateAsync({
          priceId: target.row.id!,
          price,
          ...(date && date !== target.row.asOf ? { asOf: date } : {}),
        });
        showToast('Price updated');
      } else {
        await setPrice.mutateAsync({ price, asOf: date });
        showToast(`Price updated for ${name}`);
      }
      router.refresh();
      onSaved?.();
      onClose();
    } catch (e) {
      // The server answers 409 with code DUPLICATE when the date already has a price of the user's.
      if (e instanceof ActionError && e.response.code === 'DUPLICATE') {
        setDateError(e.response.message);
        return;
      }
      showToast(getErrorMessage(e, "Couldn't update the price. Try again."), { tone: 'danger' });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="sm"
        title={editing ? 'Edit manual price' : 'Record price'}
        description={name}
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: submitting }}
        primary={{ label: editing ? 'Save price' : 'Record price', type: 'submit', form: FORM_ID, loading: submitting }}
      >
        <Dialog.Body>
          <form
            id={FORM_ID}
            noValidate
            autoComplete="off"
            className="flex flex-col gap-space-8 desk:gap-space-16"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <DateField
              label="As of"
              today={editing ? target.row.asOf : target.today}
              value={date}
              error={dateError}
              onValueChange={(v) => {
                setDate(typeof v === 'string' ? v : '');
                setDateError(undefined);
              }}
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
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
