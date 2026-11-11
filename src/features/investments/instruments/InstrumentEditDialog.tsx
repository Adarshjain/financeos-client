'use client';

import React from 'react';

import { Dialog } from '@/components/ds/Dialog/Dialog';
import { Select } from '@/components/ds/Select/Select';
import { Text } from '@/components/ds/Text/Text';
import { TextField } from '@/components/ds/TextField/TextField';
import { showToast } from '@/components/ds/Toast/Toast';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { Instrument, InstrumentCandidate, InstrumentType } from '@/lib/types';
import { useAppRouter } from '@/lib/useAppRouter';

import { CatalogSearch } from './CatalogSearch';
import {
  ASSET_CLASS_OPTIONS,
  AUTO_ASSET_CLASS,
  identifierClearError,
  INSTRUMENT_FIELD_LIMITS as LIMITS,
  type InstrumentFormErrors,
  instrumentFormErrors,
  isOverridden,
} from './instrumentEditModel';
import {
  assetClassChange,
  candidatePatch,
  editValuesOf,
  EXCHANGE_OPTIONS,
  exchangeChoice,
  exchangeSwitchable,
  identifiersLocked,
  instrumentEditRequest,
  type InstrumentEditValues,
} from './instrumentFormModel';
import { TYPE_OPTIONS } from './instrumentsModel';
import { type UpdateInstrumentResult, useUpdateInstrument } from './useInstrumentMutations';

const FORM_ID = 'instrument-edit-form';
const NO_ERRORS: InstrumentFormErrors = { fields: {}, form: null };
const ASSET_CLASS_CHOICES = [{ value: AUTO_ASSET_CLASS, label: 'Auto (catalog)' }, ...ASSET_CLASS_OPTIONS];

export interface InstrumentEditDialogProps {
  instrument: Instrument;
  onClose: () => void;
  /** Reset to catalog: the page confirms it (shown only when the user has edits of their own). */
  onReset: () => void;
  /** Called after a save, instead of refreshing the page: the page decides where to go (the holdings may have moved to another instrument). */
  onSaved?: (result: UpdateInstrumentResult) => void;
}

/** Edit an instrument for your account only. After an identifier change the holdings move to that identifier's instrument. */
export function InstrumentEditDialog({ instrument, onClose, onReset, onSaved }: InstrumentEditDialogProps) {
  const router = useAppRouter();
  const update = useUpdateInstrument(instrument.id);
  const [values, setValues] = React.useState<InstrumentEditValues>(() => editValuesOf(instrument));
  const [errors, setErrors] = React.useState<InstrumentFormErrors>(NO_ERRORS);
  const submitting = update.isPending;
  const locked = identifiersLocked(instrument, values);
  const change = (patch: Partial<InstrumentEditValues>) => setValues((v) => ({ ...v, ...patch }));

  const picked = (c: InstrumentCandidate) => {
    const { exchange, ...patch } = candidatePatch(c);
    change(exchangeSwitchable(instrument) ? patch : { ...patch, exchange });
    showToast(`Filled from “${c.name}”. Review and save`);
  };

  const submit = async () => {
    if (!values.name.trim()) {
      setErrors({ fields: { name: 'Enter a name.' }, form: null });
      return;
    }
    const clearError = locked ? null : identifierClearError(instrument, values);
    if (clearError) {
      setErrors({ fields: { [clearError.field]: clearError.message }, form: null });
      return;
    }
    setErrors(NO_ERRORS);
    try {
      const result = await update.mutateAsync({
        body: instrumentEditRequest(instrument, values),
        assetClass: assetClassChange(instrument, values.assetClass),
      });
      const { instrument: updated, moved, merged, mergeNote } = result;
      if (merged) {
        showToast(`Merged your holding into your existing ${updated.name} holding${mergeNote ? `. ${mergeNote}` : ''}`, { tone: 'success', duration: 8000 });
      } else {
        showToast(moved ? `Moved your holdings to ${updated.name}` : `${updated.name} updated`, { tone: 'success' });
      }
      if (onSaved) onSaved(result);
      else router.refresh();
      onClose();
    } catch (e) {
      const inline = instrumentFormErrors(e);
      if (inline) setErrors(inline);
      else showToast(getErrorMessage(e, "Couldn't update instrument. Try again."), { tone: 'danger' });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="sm"
        title="Edit instrument"
        description="Changes apply to your account only."
        tertiary={isOverridden(instrument) ? { label: 'Reset to catalog', onSelect: onReset, disabled: submitting } : undefined}
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: submitting }}
        primary={{ label: 'Save instrument', type: 'submit', form: FORM_ID, loading: submitting }}
      >
        <Dialog.Body>
          <div className="flex flex-col gap-space-8 desk:gap-space-12">
            <CatalogSearch type={values.type} hint={false} placeholder="Search AMFI or Yahoo to fix or fill identifiers…" onPick={picked} />
            <form
              id={FORM_ID}
              noValidate
              autoComplete="off"
              className="flex flex-col gap-space-8 desk:gap-space-12"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
                <Select label="Type" value={values.type} options={TYPE_OPTIONS} onValueChange={(v) => change({ type: v as InstrumentType })} />
                <Select label="Asset class" value={values.assetClass} options={ASSET_CLASS_CHOICES} onValueChange={(v) => change({ assetClass: v as string })} />
              </div>
              <TextField label="Name" value={values.name} maxLength={LIMITS.name} error={errors.fields.name} onValueChange={(name) => change({ name })} />
              <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
                <TextField label="Symbol" placeholder="Optional" value={values.symbol} maxLength={LIMITS.symbol} error={errors.fields.symbol} onValueChange={(symbol) => change({ symbol })} />
                {exchangeSwitchable(instrument) ? (
                  <Select label="Exchange" value={exchangeChoice(values.exchange)} options={EXCHANGE_OPTIONS} onValueChange={(v) => change({ exchange: v as string })} />
                ) : (
                  <TextField label="Exchange" placeholder="e.g. NSE, BSE" value={values.exchange} maxLength={LIMITS.exchange} error={errors.fields.exchange} onValueChange={(exchange) => change({ exchange })} />
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
                <TextField label="ISIN" disabled={locked} value={values.isin} maxLength={LIMITS.isin} error={locked ? undefined : errors.fields.isin} onValueChange={(isin) => change({ isin })} />
                <TextField label="Currency" value={values.currency} maxLength={LIMITS.currency} error={errors.fields.currency} onValueChange={(currency) => change({ currency })} />
              </div>
              <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
                <TextField label="Yahoo symbol" disabled={locked} placeholder="Stocks and ETFs" value={values.yahooSymbol} maxLength={LIMITS.yahooSymbol} error={locked ? undefined : errors.fields.yahooSymbol} onValueChange={(yahooSymbol) => change({ yahooSymbol })} />
                <TextField label="AMFI code" disabled={locked} value={values.amfiCode} maxLength={LIMITS.amfiCode} error={locked ? undefined : errors.fields.amfiCode} onValueChange={(amfiCode) => change({ amfiCode })} />
              </div>
              <Text variant="label" tone="ink-3" as="div">
                Changing the ISIN, AMFI code or Yahoo symbol moves your holdings, trades and prices to the instrument with that identifier. Your corporate actions on it move with the holding. Changing the exchange moves your holding to that exchange&apos;s listing.
              </Text>
              {errors.form ? (
                <Text variant="label" tone="danger" as="div">
                  {errors.form}
                </Text>
              ) : null}
            </form>
          </div>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
