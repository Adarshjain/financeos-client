'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import {
  Banner,
  Button,
  ConfirmDialog,
  DateField,
  Dialog,
  DialogBody,
  DialogContent,
  SegmentedControl,
  Select,
  type SelectOption,
  showToast,
  Text,
  TextField,
} from '@/components/ds';
import { AccountPicker } from '@/components/organisms';
import { appHref } from '@/features/shell/routes';
import { isAccountClosed, isAccountOfType } from '@/lib/account.types';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';
import { formatMoney } from '@/lib/format';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { AccountType, type InvestmentTransactionResponse, type SettlementType } from '@/lib/types';
import { sanitizeDecimalInput } from '@/lib/utils';

import { InstrumentAddDialog } from '../instruments/InstrumentAddDialog';
import { InstrumentSelect } from '../InstrumentSelect';
import type { InstrumentRef } from '../investmentsFormat';
import {
  allCharges,
  CHARGE_FIELDS,
  type ChargeKey,
  type ChargeTexts,
  chargeTextsOf,
  EMPTY_CHARGES,
  filledCharges,
  priceText,
  quantityText,
  type TradeFormErrors,
  tradeLabel,
  type TradeSide,
  tradeTotals,
  validateTrade,
} from './tradebookModel';
import { useTradeMutations } from './useTradeMutations';

const BROKER_TYPES: readonly AccountType[] = [AccountType.BROKER];

const SIDES = [
  { value: 'buy', label: 'Buy' },
  { value: 'sell', label: 'Sell' },
];

const SETTLEMENTS: SelectOption[] = [
  { value: 'delivery', label: 'CNC' },
  { value: 'intraday', label: 'MIS' },
];

const FORM_ID = 'trade-form';

interface FormProps {
  title: string;
  description: string;
  submitLabel: string;
  submitting: boolean;
  /** True while a form field is still working out its value: the submit waits. */
  holdSubmit?: boolean;
  /** Edit shows the settlement and every charge; Record folds the charges under a link. */
  editing: boolean;
  side: TradeSide;
  onSideChange: (side: TradeSide) => void;
  /** Rows above the quantity (instrument and, when recording, the broker below the date). */
  top?: React.ReactNode;
  bottom?: React.ReactNode;
  quantity: string;
  onQuantityChange: (v: string) => void;
  price: string;
  onPriceChange: (v: string) => void;
  date: string;
  onDateChange: (v: string) => void;
  settlement?: SettlementType;
  onSettlementChange?: (v: SettlementType) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  charges: ChargeTexts;
  onChargeChange: (key: ChargeKey, v: string) => void;
  errors: TradeFormErrors;
  onSubmit: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

/** The record and edit trade dialog: one form, two framings. */
function TradeForm(p: FormProps) {
  const [showCharges, setShowCharges] = React.useState(false);
  const totals = tradeTotals(p.side, p.quantity, p.price, p.charges);
  const chargesShown = p.editing || showCharges;
  return (
    <Dialog open onOpenChange={(open) => (open || p.submitting ? undefined : p.onCancel())}>
      <DialogContent
        size="md"
        title={p.title}
        description={p.description}
        tertiary={p.onDelete ? { label: 'Delete', tone: 'danger', onSelect: p.onDelete, disabled: p.submitting } : undefined}
        secondary={{ label: 'Cancel', onSelect: p.onCancel, disabled: p.submitting }}
        primary={{ label: p.submitLabel, type: 'submit', form: FORM_ID, loading: p.submitting, disabled: p.holdSubmit }}
      >
        <DialogBody>
          <form
            id={FORM_ID}
            noValidate
            autoComplete="off"
            className="flex flex-col gap-space-8 desk:gap-space-16"
            onSubmit={(e) => {
              e.preventDefault();
              if (!p.holdSubmit) p.onSubmit();
            }}
          >
            <SegmentedControl aria-label="Buy or sell" options={SIDES} value={p.side} onValueChange={(v) => p.onSideChange(v as TradeSide)} fullWidth />
            {p.top}
            <div className="grid grid-cols-2 desk:grid-cols-3 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
              <TextField
                label="Qty"
                inputMode="decimal"
                placeholder="0"
                value={p.quantity}
                onValueChange={(v) => p.onQuantityChange(sanitizeDecimalInput(v))}
                error={p.errors.quantity}
              />
              <TextField
                label="Price"
                inputMode="decimal"
                placeholder="0.00"
                value={p.price}
                onValueChange={(v) => p.onPriceChange(sanitizeDecimalInput(v))}
                error={p.errors.price}
              />
              <DateField className="col-span-2 desk:col-span-1" label="Date" today={todayInAppZone()} value={p.date} onValueChange={(v) => p.onDateChange(typeof v === 'string' ? v : '')} error={p.errors.date} />
            </div>
            {p.onSettlementChange ? (
              <Select label="Settlement" options={SETTLEMENTS} value={p.settlement ?? 'delivery'} onValueChange={(v) => p.onSettlementChange?.(v as SettlementType)} />
            ) : null}
            {p.bottom}
            {chargesShown ? (
              <div className="flex flex-col gap-space-8">
                <Text variant="body-strong" as="div">
                  Itemised charges
                </Text>
                <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
                  {CHARGE_FIELDS.map((f) => (
                    <TextField
                      key={f.key}
                      label={f.label}
                      inputMode="decimal"
                      placeholder="0.00"
                      value={p.charges[f.key]}
                      onValueChange={(v) => p.onChargeChange(f.key, sanitizeDecimalInput(v))}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            <TextField label="Notes" optional placeholder="Optional" value={p.notes} onValueChange={p.onNotesChange} />
            <Banner tone="neutral" rounded="md">
              <span className="flex items-baseline justify-between gap-space-12">
                <Text variant="label" tone="ink-3" as="span">
                  {`Value ${formatMoney(totals.value, { decimals: 'auto' })} · charges ${formatMoney(totals.charges, { decimals: 'auto' })}`}
                </Text>
                <Text variant="body-strong" as="span">
                  {`${p.side === 'buy' ? 'Total' : 'Net'} ${formatMoney(totals.total, { decimals: 'auto' })}`}
                </Text>
              </span>
            </Banner>
            {chargesShown ? null : (
              <div>
                <Button variant="link" size="sm" type="button" onClick={() => setShowCharges(true)}>
                  Itemise charges · brokerage, STT, exchange, GST, stamp duty
                </Button>
              </div>
            )}
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

// ---- Record -------------------------------------------------------------------------

export interface RecordTradeDialogProps {
  onClose: () => void;
  /** Called after the trade is saved (the page refreshes either way). */
  onSaved?: () => void;
  initialInstrument?: InstrumentRef | null;
  initialBrokerAccountId?: string;
}

/** Record a buy or a sell. Exported for the top bar's + on every Investments page. */
export function RecordTradeDialog({ onClose, onSaved, initialInstrument = null, initialBrokerAccountId }: RecordTradeDialogProps) {
  const router = useRouter();
  const { data: accounts = [], isLoading } = useAccounts();
  const { createTrade } = useTradeMutations();
  const brokers = React.useMemo(() => accounts.filter(isAccountOfType(AccountType.BROKER)), [accounts]);

  const [side, setSide] = React.useState<TradeSide>('buy');
  const [enteringInstrument, setEnteringInstrument] = React.useState(false);
  const [instrument, setInstrument] = React.useState<InstrumentRef | null>(initialInstrument);
  const [brokerId, setBrokerId] = React.useState(initialBrokerAccountId ?? '');
  const [quantity, setQuantity] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [date, setDate] = React.useState(() => todayInAppZone());
  const [notes, setNotes] = React.useState('');
  const [charges, setCharges] = React.useState<ChargeTexts>(EMPTY_CHARGES);
  const [errors, setErrors] = React.useState<TradeFormErrors & { instrument?: string; broker?: string }>({});
  const [resolving, setResolving] = React.useState(false);

  // The first open broker is the default until the user picks one.
  const openBrokers = brokers.filter((b) => !isAccountClosed(b) || b.id === brokerId);
  const effectiveBrokerId = brokerId || openBrokers[0]?.id || '';
  const broker = brokers.find((b) => b.id === effectiveBrokerId);

  const submit = async () => {
    const found: typeof errors = validateTrade({ quantity, price, date });
    if (!effectiveBrokerId) found.broker = 'Choose a broker account';
    if (!instrument) found.instrument = 'Choose an instrument';
    setErrors(found);
    if (Object.keys(found).length > 0 || !instrument) return;
    try {
      await createTrade.mutateAsync({
        brokerAccountId: effectiveBrokerId,
        instrumentId: instrument.id,
        type: side,
        quantity: Number(quantity),
        price: Number(price),
        tradeDate: date,
        charges: allCharges(charges),
        notes: notes.trim() || undefined,
      });
      showToast(`Recorded ${side} for ${instrument.symbol || instrument.name}`, { tone: 'success' });
      router.refresh();
      onSaved?.();
      onClose();
    } catch (e) {
      showToast(getErrorMessage(e, 'Failed to record the trade'), { tone: 'danger' });
    }
  };

  if (!isLoading && brokers.length === 0) {
    return (
      <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
        <DialogContent size="sm" title="Record trade" secondary={{ label: 'Cancel', onSelect: onClose }}>
          <DialogBody>
            <div className="flex flex-col gap-space-8 desk:gap-space-12 items-start">
              <Text variant="body" tone="ink-2" as="p">
                You need at least one broker account to record trades.
              </Text>
              <Button asChild variant="link" size="sm">
                <Link href={appHref('/accounts')}>Add a broker account</Link>
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
    <TradeForm
      title="Record trade"
      description={`${broker?.name ?? 'Broker'} · prices in ₹`}
      submitLabel={`Record ${side}`}
      submitting={createTrade.isPending}
      holdSubmit={resolving}
      editing={false}
      side={side}
      onSideChange={setSide}
      top={
        <InstrumentSelect
          value={instrument}
          onValueChange={(i) => {
            setInstrument(i);
            setErrors((e) => ({ ...e, instrument: undefined }));
          }}
          helper="Type to search your catalog, AMFI or Yahoo."
          onEnterManually={() => setEnteringInstrument(true)}
          onResolvingChange={setResolving}
          error={errors.instrument}
        />
      }
      bottom={
        <AccountPicker
          label="Broker"
          accounts={openBrokers}
          types={BROKER_TYPES}
          value={effectiveBrokerId}
          loading={isLoading}
          onValueChange={(v) => {
            setBrokerId(v ?? '');
            setErrors((e) => ({ ...e, broker: undefined }));
          }}
          error={errors.broker}
        />
      }
      quantity={quantity}
      onQuantityChange={(v) => {
        setQuantity(v);
        setErrors((e) => ({ ...e, quantity: undefined }));
      }}
      price={price}
      onPriceChange={(v) => {
        setPrice(v);
        setErrors((e) => ({ ...e, price: undefined }));
      }}
      date={date}
      onDateChange={(v) => {
        setDate(v);
        setErrors((e) => ({ ...e, date: undefined }));
      }}
      notes={notes}
      onNotesChange={setNotes}
      charges={charges}
      onChargeChange={(key, v) => setCharges((c) => ({ ...c, [key]: v }))}
      errors={errors}
      onSubmit={() => void submit()}
      onCancel={onClose}
    />
    {enteringInstrument ? (
      <InstrumentAddDialog
        initialMode="manual"
        onClose={() => setEnteringInstrument(false)}
        onCreated={(created) => {
          setInstrument(created);
          setErrors((e) => ({ ...e, instrument: undefined }));
        }}
      />
    ) : null}
    </>
  );
}

// ---- Edit ---------------------------------------------------------------------------

export interface EditTradeDialogProps {
  trade: InvestmentTransactionResponse;
  onClose: () => void;
}

/** Change a trade's side, settlement, quantity, price, date, charges and notes, or delete it. The instrument and the broker are fixed. */
export function EditTradeDialog({ trade, onClose }: EditTradeDialogProps) {
  const router = useRouter();
  const { updateTrade, deleteTrade } = useTradeMutations();
  const [side, setSide] = React.useState<TradeSide>(trade.type === 'sell' ? 'sell' : 'buy');
  const [settlement, setSettlement] = React.useState<SettlementType>(trade.settlementType === 'intraday' ? 'intraday' : 'delivery');
  const [quantity, setQuantity] = React.useState(quantityText(trade.quantity));
  const [price, setPrice] = React.useState(priceText(trade.price));
  const [date, setDate] = React.useState(trade.tradeDate.slice(0, 10));
  const [notes, setNotes] = React.useState(trade.notes ?? '');
  const [charges, setCharges] = React.useState<ChargeTexts>(() => chargeTextsOf(trade));
  const [errors, setErrors] = React.useState<TradeFormErrors>({});
  const [confirming, setConfirming] = React.useState(false);

  const submit = async () => {
    const found = validateTrade({ quantity, price, date });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      await updateTrade.mutateAsync({
        id: trade.id,
        body: {
          type: side,
          settlementType: settlement,
          quantity: Number(quantity),
          price: Number(price),
          tradeDate: date,
          charges: filledCharges(charges),
          notes: notes.trim() || undefined,
        },
      });
      showToast('Trade updated', { tone: 'success' });
      router.refresh();
      onClose();
    } catch (e) {
      showToast(getErrorMessage(e, 'Failed to update the trade'), { tone: 'danger' });
    }
  };

  const remove = async () => {
    try {
      await deleteTrade.mutateAsync(trade.id);
      showToast('Trade deleted');
      router.refresh();
      onClose();
    } catch (e) {
      setConfirming(false);
      showToast(getErrorMessage(e, 'Failed to delete the trade'), { tone: 'danger' });
    }
  };

  return (
    <>
      <TradeForm
        title="Edit trade"
        description={`${trade.instrument.symbol || trade.instrument.name} · ${trade.brokerName} · prices in ₹`}
        submitLabel="Save trade"
        submitting={updateTrade.isPending}
        editing
        side={side}
        onSideChange={setSide}
        quantity={quantity}
        onQuantityChange={(v) => {
          setQuantity(v);
          setErrors((e) => ({ ...e, quantity: undefined }));
        }}
        price={price}
        onPriceChange={(v) => {
          setPrice(v);
          setErrors((e) => ({ ...e, price: undefined }));
        }}
        date={date}
        onDateChange={(v) => {
          setDate(v);
          setErrors((e) => ({ ...e, date: undefined }));
        }}
        settlement={settlement}
        onSettlementChange={setSettlement}
        notes={notes}
        onNotesChange={setNotes}
        charges={charges}
        onChargeChange={(key, v) => setCharges((c) => ({ ...c, [key]: v }))}
        errors={errors}
        onSubmit={() => void submit()}
        onCancel={onClose}
        onDelete={() => setConfirming(true)}
      />
      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => {
          if (!deleteTrade.isPending) setConfirming(open);
        }}
        title={`Delete ${tradeLabel(trade)}?`}
        description="This trade leaves the tradebook and the holding is worked out again."
        impact={['Realised gains for the year are recalculated.', 'Other trades, prices and dividends of this instrument stay.']}
        confirmLabel="Delete trade"
        confirmLoading={deleteTrade.isPending}
        onConfirm={() => void remove()}
      />
    </>
  );
}
