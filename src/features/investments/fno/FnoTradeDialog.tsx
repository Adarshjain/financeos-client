'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import {
  Card,
  ConfirmDialog,
  DateField,
  Dialog,
  DialogBody,
  DialogContent,
  SegmentedControl,
  Select,
  showToast,
  Text,
  TextField,
} from '@/components/ds';
import { AmountField } from '@/components/organisms';
import type { Broker } from '@/lib/account.types';
import { amountExpressionProps, resolveAmountExpression } from '@/lib/amountExpression';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';
import type { FnoContractType, FnoTradeResponse, OptionType } from '@/lib/types';
import { sanitizeDecimalInput } from '@/lib/utils';

import {
  brokerLabel,
  emptyForm,
  type FnoTradeErrors,
  type FnoTradeForm,
  formFromTrade,
  netModel,
  toRequest,
  validateForm,
} from './fnoTradeForm';
import { useCreateFnoTrade, useDeleteFnoTrade, useUpdateFnoTrade } from './useFnoTradeMutations';

const FORM_ID = 'fno-trade-form';

const KINDS: { value: FnoContractType; label: string }[] = [
  { value: 'future', label: 'Futures' },
  { value: 'option', label: 'Options' },
];

const OPTION_TYPES: { value: OptionType; label: string }[] = [
  { value: 'CE', label: 'CE' },
  { value: 'PE', label: 'PE' },
];

export interface FnoTradeDialogProps {
  /** The trade being edited; none records a new one. */
  trade?: FnoTradeResponse;
  brokers: Pick<Broker, 'id' | 'name' | 'clientId'>[];
  onClose: () => void;
}

/** Record or edit an F&O trade. An edit also offers Delete, behind a confirmation. */
export function FnoTradeDialog({ trade, brokers, onClose }: FnoTradeDialogProps) {
  const router = useRouter();
  const create = useCreateFnoTrade();
  const update = useUpdateFnoTrade(trade?.id);
  const remove = useDeleteFnoTrade();
  const today = React.useMemo(() => todayInAppZone(), []);
  const [form, setForm] = React.useState<FnoTradeForm>(() => (trade ? formFromTrade(trade) : emptyForm(brokers, today)));
  const [errors, setErrors] = React.useState<FnoTradeErrors>({});
  const [confirming, setConfirming] = React.useState(false);
  const saving = create.isPending || update.isPending;
  const isOption = form.contractType === 'option';
  const net = netModel(form);

  const set = <K extends keyof FnoTradeForm>(key: K, value: FnoTradeForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const amountProps = (key: 'strike' | 'buyValue' | 'sellValue' | 'totalCharges') =>
    amountExpressionProps(form[key], (v) => set(key, v));
  const dateValue = (v: unknown) => (typeof v === 'string' ? v : '');

  const submit = async () => {
    // Arithmetic typed in an amount field resolves before the check (Enter submits without a blur).
    const resolved: FnoTradeForm = {
      ...form,
      strike: resolveAmountExpression(form.strike),
      buyValue: resolveAmountExpression(form.buyValue),
      sellValue: resolveAmountExpression(form.sellValue),
      totalCharges: resolveAmountExpression(form.totalCharges),
    };
    setForm(resolved);
    const found = validateForm(resolved);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const body = toRequest(resolved, trade?.notes);
    try {
      if (trade) await update.mutateAsync(body);
      else await create.mutateAsync(body);
      showToast(trade ? 'F&O trade updated' : 'F&O trade recorded');
      router.refresh();
      onClose();
    } catch (e) {
      showToast(getErrorMessage(e, 'Failed to save the F&O trade'), { tone: 'danger' });
    }
  };

  const confirmDelete = async () => {
    if (!trade) return;
    try {
      await remove.mutateAsync(trade.id);
      showToast(`Deleted the trade for ${trade.tradingSymbol}`);
      router.refresh();
      onClose();
    } catch (e) {
      showToast(getErrorMessage(e, 'Failed to delete the F&O trade'), { tone: 'danger' });
      setConfirming(false);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => (open || saving ? undefined : onClose())}>
        <DialogContent
          size="sm"
          title={trade ? 'Edit F&O trade' : 'Add F&O trade'}
          description="Values in ₹"
          tertiary={trade ? { label: 'Delete', onSelect: () => setConfirming(true), disabled: saving } : undefined}
          secondary={{ label: 'Cancel', onSelect: onClose, disabled: saving }}
          primary={{ label: 'Save trade', type: 'submit', form: FORM_ID, loading: saving }}
        >
          <DialogBody>
            <form
              id={FORM_ID}
              noValidate
              autoComplete="off"
              className="flex flex-col gap-space-12"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <SegmentedControl
                className="self-start"
                size="sm"
                options={KINDS}
                value={form.contractType}
                onValueChange={(v) => set('contractType', v)}
              />
              <Select
                label="Broker account"
                placeholder="Select a broker"
                value={form.brokerAccountId}
                options={brokers.map((b) => ({ value: b.id, label: brokerLabel(b) }))}
                onValueChange={(v) => set('brokerAccountId', v as string)}
                error={errors.brokerAccountId}
              />
              <TextField
                label="Trading symbol"
                placeholder="NIFTY26OCT25200CE"
                value={form.tradingSymbol}
                onValueChange={(v) => set('tradingSymbol', v)}
                error={errors.tradingSymbol}
              />
              <div className={isOption ? 'grid grid-cols-3 gap-space-12' : 'flex flex-col'}>
                <TextField
                  label="Underlying"
                  placeholder="NIFTY"
                  value={form.underlying}
                  onValueChange={(v) => set('underlying', v)}
                />
                {isOption ? (
                  <>
                    <Select
                      label="Option type"
                      placeholder="CE / PE"
                      value={form.optionType}
                      options={OPTION_TYPES}
                      onValueChange={(v) => set('optionType', v as OptionType)}
                    />
                    <TextField
                      label="Strike"
                      inputMode="decimal"
                      placeholder="25,200"
                      value={form.strike}
                      {...amountProps('strike')}
                      error={errors.strike}
                    />
                  </>
                ) : null}
              </div>
              <div className="grid grid-cols-3 gap-space-12">
                <DateField
                  label="Expiry"
                  today={today}
                  value={form.expiry}
                  onValueChange={(v) => set('expiry', dateValue(v))}
                  error={errors.expiry}
                />
                <DateField
                  label="Entry date"
                  today={today}
                  value={form.entryDate}
                  onValueChange={(v) => set('entryDate', dateValue(v))}
                  error={errors.entryDate}
                />
                <DateField
                  label="Exit date"
                  today={today}
                  value={form.exitDate}
                  onValueChange={(v) => set('exitDate', dateValue(v))}
                  error={errors.exitDate}
                />
              </div>
              <div className="grid grid-cols-3 gap-space-12">
                <TextField
                  label="Qty / lot size"
                  inputMode="decimal"
                  placeholder="75"
                  value={form.quantity}
                  onValueChange={(v) => set('quantity', sanitizeDecimalInput(v))}
                  error={errors.quantity}
                />
                <AmountField
                  label="Buy value"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.buyValue}
                  {...amountProps('buyValue')}
                  error={errors.buyValue}
                />
                <AmountField
                  label="Sell value"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.sellValue}
                  {...amountProps('sellValue')}
                  error={errors.sellValue}
                />
              </div>
              <AmountField
                label="Total charges"
                inputMode="decimal"
                placeholder="0.00"
                value={form.totalCharges}
                {...amountProps('totalCharges')}
                error={errors.totalCharges}
              />
              {net ? (
                <Card variant="inset">
                  <div className="flex items-baseline justify-between gap-space-12 p-space-12">
                    <Text variant="label" tone="ink-3">
                      {net.line}
                    </Text>
                    <Text variant="body-strong" tone={net.tone}>
                      {net.net}
                    </Text>
                  </div>
                </Card>
              ) : null}
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>
      {trade ? (
        <ConfirmDialog
          open={confirming}
          onOpenChange={(open) => {
            if (!open && !remove.isPending) setConfirming(false);
          }}
          title="Delete F&O trade"
          description={`Delete the trade for ${trade.tradingSymbol}?`}
          impact={['Only this trade is deleted.', 'Your other trades stay.']}
          confirmLabel="Delete trade"
          confirmLoading={remove.isPending}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
    </>
  );
}
