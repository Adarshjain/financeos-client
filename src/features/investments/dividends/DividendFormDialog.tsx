'use client';

import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { DateField } from '@/components/ds/DateField/DateField';
import { ConfirmDialog, Dialog } from '@/components/ds/Dialog/Dialog';
import { Select } from '@/components/ds/Select/Select';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { TextField } from '@/components/ds/TextField/TextField';
import { showToast } from '@/components/ds/Toast/Toast';
import { AccountPicker } from '@/components/organisms/AccountPicker/AccountPicker';
import { AmountField } from '@/components/organisms/AmountField/AmountField';
import { amountExpressionProps, resolveAmountExpression } from '@/lib/amountExpression';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { watchSession } from '@/lib/authExpiry';
import { todayInAppZone } from '@/lib/date-range';
import { formatMoney } from '@/lib/format';
import { keys } from '@/lib/query/keys';
import { AccountType, type Dividend, type DividendType } from '@/lib/types';

import { DividendReceiptSection } from './DividendReceiptSection';
import { type DividendFormOptions, loadDividendFormOptions } from './dividendsActions';
import { toDecimal,TYPE_OPTIONS } from './dividendsModel';
import { useDividendMutations } from './useDividendMutations';

const BROKER_TYPES: readonly AccountType[] = [AccountType.BROKER];

const FORM_ID = 'dividend-form';

/** What the record form starts with: a bank credit that looks like a dividend fills the amount and date and is linked once recorded. */
export interface DividendPrefill {
  brokerAccountId?: string;
  instrumentId?: string;
  amount?: number;
  payDate?: string;
  perUnit?: number;
  exDate?: string;
  notes?: string;
  linkTransactionId?: string;
}

/** The brokers and held positions the record form chooses from. */
function useFormOptions() {
  return useQuery({
    queryKey: [...keys.investments.all, 'dividend-form-options'],
    queryFn: async (): Promise<DividendFormOptions> => {
      const result = await watchSession(loadDividendFormOptions());
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });
}

interface FieldsProps {
  options: DividendFormOptions | null;
  dividend: Dividend | null;
  prefill?: DividendPrefill;
  onClose: () => void;
  onSaved?: () => void;
}

/** The record and edit form: one body for both, the account and instrument are chosen only when recording. */
function DividendForm({ options, dividend, prefill, onClose, onSaved }: FieldsProps) {
  const editing = dividend !== null;
  const today = todayInAppZone();
  const mutations = useDividendMutations();

  const [brokerId, setBrokerId] = React.useState(dividend?.brokerAccountId ?? prefill?.brokerAccountId ?? options?.brokers[0]?.id ?? '');
  const [instrumentId, setInstrumentId] = React.useState(dividend?.instrumentId ?? prefill?.instrumentId ?? '');
  const [type, setType] = React.useState<DividendType>(dividend?.type ?? 'dividend');
  const [exDate, setExDate] = React.useState(dividend?.exDate?.slice(0, 10) ?? prefill?.exDate ?? '');
  const [payDate, setPayDate] = React.useState(dividend?.payDate?.slice(0, 10) ?? prefill?.payDate ?? today);
  const [perUnit, setPerUnit] = React.useState(dividend?.perUnit ? String(dividend.perUnit) : prefill?.perUnit != null ? String(prefill.perUnit) : '');
  const [amount, setAmount] = React.useState(dividend ? String(dividend.amount) : prefill?.amount != null ? String(prefill.amount) : '');
  const [tds, setTds] = React.useState(dividend?.tds ? String(dividend.tds) : '');
  const [notes, setNotes] = React.useState(dividend?.notes ?? prefill?.notes ?? '');
  const [errors, setErrors] = React.useState<{ broker?: string; instrument?: string; amount?: string }>({});
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  const submitting = mutations.create.isPending || mutations.update.isPending;
  const positions = (options?.positions ?? []).filter((p) => !brokerId || p.brokerAccountId === brokerId);
  const instrumentOptions = positions.map((p) => ({
    value: p.instrument.id,
    label: p.instrument.symbol ? `${p.instrument.symbol} · ${p.instrument.name}` : p.instrument.name,
  }));

  const done = async (message: string) => {
    showToast(message);
    await mutations.refresh();
    onSaved?.();
    onClose();
  };

  const submit = async () => {
    const resolved = resolveAmountExpression(amount);
    if (resolved !== amount) setAmount(resolved);
    const gross = toDecimal(resolved, 2);
    const next: typeof errors = {};
    if (!editing && !brokerId) next.broker = 'Choose an account.';
    if (!editing && !instrumentId) next.instrument = 'Choose a held instrument.';
    if (gross === undefined || gross <= 0) next.amount = 'Enter an amount above zero.';
    setErrors(next);
    if (Object.keys(next).length > 0 || gross === undefined) return;

    const body = {
      type,
      amount: gross,
      perUnit: toDecimal(perUnit, 4),
      tds: toDecimal(resolveAmountExpression(tds), 2),
      exDate: exDate || undefined,
      payDate,
      notes: notes.trim() || undefined,
    };
    try {
      if (dividend) {
        await mutations.update.mutateAsync({ id: dividend.id, body });
        await done('Dividend updated');
        return;
      }
      const created = await mutations.create.mutateAsync({ ...body, brokerAccountId: brokerId, instrumentId });
      let linked = false;
      if (prefill?.linkTransactionId) {
        // The dividend exists now; a failed link must not read as a failed record.
        try {
          await mutations.link.mutateAsync({ id: created.id, transactionId: prefill.linkTransactionId });
          linked = true;
        } catch (e) {
          showToast(getErrorMessage(e, "Dividend recorded, but couldn't link the bank credit. Try again."), { tone: 'danger' });
        }
      }
      await done(linked ? 'Dividend recorded and linked' : 'Dividend recorded');
    } catch (e) {
      showToast(getErrorMessage(e, editing ? "Couldn't update the dividend. Try again." : "Couldn't record the dividend. Try again."), { tone: 'danger' });
    }
  };

  const title = dividend ? `${dividend.symbol || dividend.instrumentName || 'Instrument'}${dividend.brokerName ? ` · ${dividend.brokerName}` : ''}` : undefined;

  return (
    <>
      <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
        <Dialog.Content
          size="sm"
          title={editing ? 'Edit dividend' : 'Record dividend'}
          description={title}
          tertiary={dividend ? { label: 'Delete', tone: 'danger', onSelect: () => setConfirmingDelete(true), disabled: submitting } : undefined}
          secondary={{ label: 'Cancel', onSelect: onClose, disabled: submitting }}
          primary={{ label: editing ? 'Save dividend' : 'Record dividend', type: 'submit', form: FORM_ID, loading: submitting }}
        >
          <Dialog.Body>
            <div className="flex flex-col gap-space-8 desk:gap-space-16">
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
                <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
                  <Select label="Type" options={TYPE_OPTIONS} value={type} onValueChange={(v) => setType(v as DividendType)} />
                  {editing ? (
                    <TextField label="Account" value={dividend?.brokerName ?? ''} disabled readOnly />
                  ) : (
                    <AccountPicker
                      label="Account"
                      accounts={(options?.brokers ?? []).map((b) => ({ ...b, type: AccountType.BROKER }))}
                      types={BROKER_TYPES}
                      value={brokerId || null}
                      placeholder="Choose an account"
                      error={errors.broker}
                      onValueChange={(v) => {
                        setBrokerId(v ?? '');
                        setInstrumentId('');
                        setErrors((e) => ({ ...e, broker: undefined }));
                      }}
                    />
                  )}
                </div>
                {editing ? null : (
                  <Select
                    label="Instrument"
                    options={instrumentOptions}
                    value={instrumentId}
                    searchable
                    placeholder={instrumentOptions.length === 0 ? 'No held positions for this account' : 'Choose a held instrument'}
                    error={errors.instrument}
                    onValueChange={(v) => {
                      setInstrumentId(v as string);
                      setErrors((e) => ({ ...e, instrument: undefined }));
                    }}
                  />
                )}
                <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
                  <DateField label="Ex-date" today={today} value={exDate} onValueChange={(v) => setExDate(typeof v === 'string' ? v : '')} />
                  <DateField label="Pay date" today={today} value={payDate} onValueChange={(v) => setPayDate(typeof v === 'string' ? v : '')} />
                </div>
                <div className="grid grid-cols-3 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
                  <TextField
                    label="Per unit"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={perUnit}
                    onValueChange={setPerUnit}
                  />
                  <AmountField
                    label="Amount"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    {...amountExpressionProps(amount, setAmount, () => setErrors((e) => ({ ...e, amount: undefined })))}
                    error={errors.amount}
                  />
                  <AmountField
                    label="TDS"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={tds}
                    {...amountExpressionProps(tds, setTds)}
                  />
                </div>
                <TextField label="Notes" placeholder="Optional" value={notes} onValueChange={setNotes} />
              </form>
              {dividend ? (
                <DividendReceiptSection dividend={dividend} amount={amount} tds={tds} onUseTds={setTds} mutations={mutations} onChanged={onSaved} />
              ) : null}
            </div>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>

      {dividend ? (
        <ConfirmDialog
          open={confirmingDelete}
          onOpenChange={(open) => {
            if (!mutations.remove.isPending) setConfirmingDelete(open);
          }}
          title={`Delete ${dividend.symbol || dividend.instrumentName || 'dividend'} · ${formatMoney(Number(dividend.amount || 0) - Number(dividend.tds || 0), { decimals: 'auto' })}?`}
          description="This payout record goes. A bank credit it was linked to stays in your transactions, unlinked. This can't be undone."
          confirmLabel="Delete"
          confirmLoading={mutations.remove.isPending}
          onConfirm={() => {
            void (async () => {
              try {
                await mutations.remove.mutateAsync(dividend.id);
                setConfirmingDelete(false);
                await done('Dividend deleted');
              } catch (e) {
                showToast(getErrorMessage(e, "Couldn't delete the dividend. Try again."), { tone: 'danger' });
              }
            })();
          }}
        />
      ) : null}
    </>
  );
}

export interface DividendAddDialogProps {
  onClose: () => void;
  prefill?: DividendPrefill;
  /** Called after the dividend was recorded, before the dialog closes. */
  onSaved?: () => void;
}

/** Records a dividend: account, held instrument, type, dates, per unit, amount, TDS and notes. The top bar's + opens it. */
export function DividendAddDialog({ onClose, prefill, onSaved }: DividendAddDialogProps) {
  const query = useFormOptions();
  if (query.isPending) {
    return (
      <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
        <Dialog.Content size="sm" title="Record dividend" secondary={{ label: 'Cancel', onSelect: onClose }}>
          <Dialog.Body>
            <div className="flex flex-col gap-space-8 desk:gap-space-12">
              <Skeleton height={32} />
              <Skeleton height={32} />
              <Skeleton height={32} />
            </div>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    );
  }
  if (query.isError) {
    return (
      <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
        <Dialog.Content
          size="sm"
          title="Record dividend"
          description="Couldn't load the accounts and holdings. Close this and try again."
          secondary={{ label: 'Close', onSelect: onClose }}
        >
          <Dialog.Body>{null}</Dialog.Body>
        </Dialog.Content>
      </Dialog>
    );
  }
  return <DividendForm options={query.data} dividend={null} prefill={prefill} onClose={onClose} onSaved={onSaved} />;
}

export interface DividendEditDialogProps {
  dividend: Dividend;
  onClose: () => void;
  /** Called after a save, a delete, or a change to the receipt (link, unlink, note). */
  onChanged?: () => void;
}

/** One dividend: its figures, the bank credit it landed as, and Delete (which asks first). */
export function DividendEditDialog({ dividend, onClose, onChanged }: DividendEditDialogProps) {
  return <DividendForm options={null} dividend={dividend} onClose={onClose} onSaved={onChanged} />;
}
