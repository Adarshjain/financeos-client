'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Dialog, SegmentedControl, Select, showToast, Text, TextField } from '@/components/ds';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { Instrument, InstrumentCandidate, InstrumentType } from '@/lib/types';

import { candidateKey,CatalogSearch } from './CatalogSearch';
import { INSTRUMENT_FIELD_LIMITS as LIMITS, type InstrumentFormErrors,instrumentFormErrors } from './instrumentEditModel';
import { defaultYahooSymbol, emptyInstrumentForm, type InstrumentFormValues, instrumentRequest } from './instrumentFormModel';
import { TYPE_OPTIONS } from './instrumentsModel';
import { useResolveInstrumentMutation } from './useCatalogSearch';
import { useCreateInstrument } from './useCreateInstrument';

const FORM_ID = 'instrument-add-form';

export type InstrumentAddMode = 'catalog' | 'manual';

export interface InstrumentAddDialogProps {
  onClose: () => void;
  /** Which way in the dialog opens: the catalog search (default) or the manual form. */
  initialMode?: InstrumentAddMode;
  /** Called with the instrument once it is added (a form that was picking one selects it). */
  onCreated?: (instrument: Instrument) => void;
}

/** Add an instrument: pick it from the live AMFI and Yahoo catalogs, or enter it by hand. Refreshes the page after saving. */
export function InstrumentAddDialog({ onClose, initialMode = 'catalog', onCreated }: InstrumentAddDialogProps) {
  const router = useRouter();
  const [mode, setMode] = React.useState<InstrumentAddMode>(initialMode);
  const [values, setValues] = React.useState<InstrumentFormValues>(emptyInstrumentForm);
  const [yahooEdited, setYahooEdited] = React.useState(false);
  const [errors, setErrors] = React.useState<InstrumentFormErrors>({ fields: {}, form: null });
  const [resolvingKey, setResolvingKey] = React.useState<string | null>(null);
  const create = useCreateInstrument();
  const resolve = useResolveInstrumentMutation();
  const submitting = create.isPending;

  const change = (patch: Partial<InstrumentFormValues>) => setValues((v) => ({ ...v, ...patch }));

  const changeSymbol = (symbol: string) => {
    const auto = !yahooEdited && values.type !== 'mutual_fund' ? { yahooSymbol: defaultYahooSymbol(values.type, symbol) ?? '' } : {};
    change({ symbol, ...auto });
  };

  const changeType = (type: InstrumentType) => {
    const auto = !yahooEdited && type !== 'mutual_fund' ? defaultYahooSymbol(type, values.symbol) : null;
    change({ type, ...(auto ? { yahooSymbol: auto } : {}) });
  };

  const pick = async (c: InstrumentCandidate) => {
    setResolvingKey(candidateKey(c));
    try {
      const resolved = await resolve.mutateAsync({
        type: c.type,
        name: c.name,
        symbol: c.symbol,
        exchange: c.exchange,
        isin: c.isin,
        amfiCode: c.amfiCode,
        yahooSymbol: c.yahooSymbol,
        currency: c.currency,
        existingInstrumentId: c.existingInstrumentId,
      });
      showToast(`${resolved.name} added`, { tone: 'success' });
      onCreated?.(resolved);
      router.refresh();
      onClose();
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't add instrument. Try again."), { tone: 'danger' });
      setResolvingKey(null);
    }
  };

  const submit = async () => {
    if (!values.name.trim()) {
      setErrors({ fields: { name: 'Enter a name.' }, form: null });
      return;
    }
    setErrors({ fields: {}, form: null });
    try {
      const created = await create.mutateAsync(instrumentRequest(values));
      showToast(`${created.name} added`, { tone: 'success' });
      onCreated?.(created);
      router.refresh();
      onClose();
    } catch (e) {
      const inline = instrumentFormErrors(e);
      if (inline) setErrors(inline);
      else showToast(getErrorMessage(e, "Couldn't add instrument. Try again."), { tone: 'danger' });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="sm"
        title="Add instrument"
        description={mode === 'manual' ? 'Not in the catalog? Enter it by hand.' : 'Search the live AMFI and Yahoo catalogs and pick.'}
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: submitting }}
        primary={mode === 'manual' ? { label: 'Add instrument', type: 'submit', form: FORM_ID, loading: submitting } : undefined}
      >
        <Dialog.Body>
          <div className="flex flex-col gap-space-8 desk:gap-space-16">
            <SegmentedControl
              fullWidth
              aria-label="How to add"
              options={[
                { value: 'catalog', label: 'Catalog' },
                { value: 'manual', label: 'Enter manually' },
              ]}
              value={mode}
              onValueChange={(v) => setMode(v as InstrumentAddMode)}
            />
            {mode === 'catalog' ? (
              <CatalogSearch autoFocus placeholder="Search by name or symbol (AMFI / Yahoo)" busyKey={resolvingKey} onPick={(c) => void pick(c)} />
            ) : (
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
                  <Select label="Type" value={values.type} options={TYPE_OPTIONS} onValueChange={(v) => changeType(v as InstrumentType)} />
                  <TextField label="Currency" value={values.currency} maxLength={LIMITS.currency} error={errors.fields.currency} onValueChange={(currency) => change({ currency })} />
                </div>
                <TextField label="Name" value={values.name} maxLength={LIMITS.name} error={errors.fields.name} onValueChange={(name) => change({ name })} />
                <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
                  <TextField label="Symbol" value={values.symbol} maxLength={LIMITS.symbol} error={errors.fields.symbol} onValueChange={changeSymbol} />
                  <TextField label="Exchange" value={values.exchange} maxLength={LIMITS.exchange} error={errors.fields.exchange} onValueChange={(exchange) => change({ exchange })} />
                </div>
                <TextField label="ISIN" optional value={values.isin} maxLength={LIMITS.isin} error={errors.fields.isin} onValueChange={(isin) => change({ isin })} />
                <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
                  <TextField
                    label="Yahoo symbol"
                    value={values.yahooSymbol}
                    maxLength={LIMITS.yahooSymbol}
                    error={errors.fields.yahooSymbol}
                    onValueChange={(yahooSymbol) => {
                      setYahooEdited(true);
                      change({ yahooSymbol });
                    }}
                  />
                  <TextField label="AMFI code" placeholder="Funds" value={values.amfiCode} maxLength={LIMITS.amfiCode} error={errors.fields.amfiCode} onValueChange={(amfiCode) => change({ amfiCode })} />
                </div>
                <Text variant="label" tone="ink-3" as="div">
                  Prices come from Yahoo for a symbol, or from AMFI for a fund code.
                </Text>
                {errors.form ? (
                  <Text variant="label" tone="danger" as="div">
                    {errors.form}
                  </Text>
                ) : null}
              </form>
            )}
          </div>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
