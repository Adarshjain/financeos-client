'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import {
  Card,
  ConfirmDialog,
  DateField,
  Dialog,
  ListRow,
  Select,
  showToast,
  Text,
  TextField,
} from '@/components/ds';
import { AmountField } from '@/components/organisms';
import { IrreversibleNote } from '@/features/shell/IrreversibleNote';
import { amountExpressionProps } from '@/lib/amountExpression';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { watchSession } from '@/lib/authExpiry';
import { todayInAppZone } from '@/lib/date-range';
import type { CorporateActionItem, CorporateActionKind, CorporateActionPreview } from '@/lib/investments.types';
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from '@/lib/useDebouncedValue';

import { isBadRequest } from '../badRequest';
import { InstrumentSelect } from '../InstrumentSelect';
import {
  type CorporateActionForm,
  type FormErrors,
  hasTarget,
  initialForm,
  instrumentLabel,
  type InstrumentRef,
  KIND_OPTIONS,
  ratioCopy,
  requestBody,
  validateForm,
} from './corporateActionFormModel';
import { CORPORATE_ACTION_GONE_MESSAGE, isCorporateActionGone } from './corporateActionGone';
import { ratioText } from './corporateActionRatioModel';
import { loadCorporateActionPreview } from './corporateActionActions';
import { KIND_LABELS, type PreviewLine, previewLines } from './corporateActionsModel';
import { useCorporateActionMutations } from './useCorporateActionMutations';

const FORM_ID = 'corporate-action-form';

export interface CorporateActionDialogProps {
  onClose: () => void;
  /** Record for this instrument (the holding page's "record a merger" link). The user can still change it. */
  instrument?: InstrumentRef;
  /** The kind to start on. */
  type?: CorporateActionKind;
  /** A saved action to change or delete. */
  action?: CorporateActionItem;
}

type PreviewState =
  | { key: string; status: 'ready'; data: CorporateActionPreview }
  | { key: string; status: 'error'; message: string };

/**
 * Records, edits or deletes a corporate action. While a new action is being filled in, its effect on the
 * holdings (quantity and cost, rolled back on the server) is shown as "After saving".
 */
export function CorporateActionDialog({ onClose, instrument, type, action }: CorporateActionDialogProps) {
  const router = useRouter();
  const editing = Boolean(action);
  const [today] = React.useState(() => todayInAppZone());
  const [form, setForm] = React.useState<CorporateActionForm>(() => initialForm({ today, instrument, type, action }));
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [resolvingMain, setResolvingMain] = React.useState(false);
  const [resolvingTarget, setResolvingTarget] = React.useState(false);
  const resolving = resolvingMain || resolvingTarget;
  const [formError, setFormError] = React.useState<string | undefined>();
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const { createMutation, updateMutation, deleteMutation } = useCorporateActionMutations(form.instrument?.id);
  const saving = createMutation.isPending || updateMutation.isPending;
  const deleting = deleteMutation.isPending;

  const change = (patch: Partial<CorporateActionForm>, clear?: keyof FormErrors) => {
    setForm((f) => ({ ...f, ...patch }));
    setFormError(undefined);
    if (clear) setErrors((e) => ({ ...e, [clear]: undefined }));
  };

  // ---- The effect of saving it ----
  // Notes do not change the effect, so typing them never asks again. An edit replays as a replacement of the saved action.
  const body = React.useMemo(() => requestBody({ ...form, notes: '' }), [form]);
  const previewKey = form.instrument && body ? JSON.stringify([form.instrument.id, { ...body, excludeActionId: action?.id }]) : null;
  const settledKey = useDebouncedValue(previewKey, SEARCH_DEBOUNCE_MS);
  const [preview, setPreview] = React.useState<PreviewState | null>(null);
  React.useEffect(() => {
    if (!settledKey) return;
    let stale = false;
    const [instrumentId, requestJson] = JSON.parse(settledKey) as [string, Parameters<typeof loadCorporateActionPreview>[1]];
    void watchSession(loadCorporateActionPreview(instrumentId, requestJson)).then((result) => {
      if (stale) return;
      if (!result.success) {
        setPreview({ key: settledKey, status: 'error', message: result.error.message });
        return;
      }
      setPreview({ key: settledKey, status: 'ready', data: result.data });
    });
    return () => {
      stale = true;
    };
  }, [settledKey]);

  // ---- Save and delete ----
  const submit = async () => {
    if (resolving) return;
    const found = validateForm(form);
    setErrors(found);
    const request = requestBody(form);
    if (!request || !form.instrument) return;
    try {
      if (action) {
        await updateMutation.mutateAsync({ id: action.id, body: request });
        showToast('Corporate action updated');
      } else {
        await createMutation.mutateAsync(request);
        showToast('Corporate action recorded');
      }
      router.refresh();
      onClose();
    } catch (e) {
      if (action && isCorporateActionGone(e)) {
        showToast(CORPORATE_ACTION_GONE_MESSAGE);
        router.refresh();
        onClose();
        return;
      }
      if (isBadRequest(e)) {
        setFormError(getErrorMessage(e, 'The corporate action was not accepted.'));
        return;
      }
      showToast(getErrorMessage(e, "Couldn't save the corporate action. Try again."), { tone: 'danger' });
    }
  };

  const remove = async () => {
    if (!action) return;
    try {
      await deleteMutation.mutateAsync(action.id);
      showToast('Corporate action deleted');
      router.refresh();
      onClose();
    } catch (e) {
      if (isCorporateActionGone(e)) {
        showToast(CORPORATE_ACTION_GONE_MESSAGE);
        router.refresh();
        onClose();
        return;
      }
      setConfirmingDelete(false);
      showToast(getErrorMessage(e, "Couldn't delete the corporate action. Try again."), { tone: 'danger' });
    }
  };

  const copy = ratioCopy(form.type);
  const merging = hasTarget(form.type);
  const kindLabel = KIND_LABELS[form.type].toLowerCase();
  const shownPreview = previewKey && preview?.key === previewKey ? preview : null;
  const settling = previewKey !== null && shownPreview === null;
  const lines: PreviewLine[] =
    shownPreview?.status === 'ready'
      ? previewLines(
          shownPreview.data,
          form.instrument ? instrumentLabel(form.instrument) : '',
          form.target ? instrumentLabel(form.target) : '',
        )
      : [];

  return (
    <>
      <Dialog open onOpenChange={(open) => (open || confirmingDelete ? undefined : onClose())}>
        <Dialog.Content
          size="sm"
          title={editing ? 'Edit corporate action' : 'Record corporate action'}
          description="Quantity and cost update when you save."
          tertiary={editing ? { label: 'Delete', tone: 'danger', onSelect: () => setConfirmingDelete(true), disabled: saving } : undefined}
          secondary={{ label: 'Cancel', onSelect: onClose, disabled: saving }}
          primary={{ label: editing ? `Save ${kindLabel}` : `Record ${kindLabel}`, type: 'submit', form: FORM_ID, loading: saving, disabled: resolving }}
        >
          <Dialog.Body>
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
                <InstrumentSelect
                  label="Instrument"
                  value={form.instrument}
                  disabled={editing}
                  resolveExisting={false}
                  error={errors.instrument}
                  onValueChange={(i) => change({ instrument: i }, 'instrument')}
                  onResolveError={(message) => showToast(message, { tone: 'danger' })}
                  onResolvingChange={setResolvingMain}
                />
                <Select
                  label="Action"
                  value={form.type}
                  options={KIND_OPTIONS}
                  onValueChange={(v) => change({ type: v as CorporateActionKind })}
                />
              </div>
              <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
                <DateField
                  label="Ex-date"
                  today={today}
                  value={form.exDate}
                  error={errors.exDate}
                  onValueChange={(v) => change({ exDate: typeof v === 'string' ? v : '' }, 'exDate')}
                />
                {merging ? (
                  <InstrumentSelect
                    label={form.type === 'merger' ? 'Acquirer instrument' : 'Child instrument'}
                    value={form.target}
                    resolveExisting={false}
                    error={errors.target}
                    onValueChange={(i) => change({ target: i }, 'target')}
                    onResolveError={(message) => showToast(message, { tone: 'danger' })}
                    onResolvingChange={setResolvingTarget}
                  />
                ) : null}
              </div>
              <div className="flex flex-col gap-space-8">
                <Text variant="label" tone="ink-3" as="div">
                  {copy.heading}
                </Text>
                <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
                  <TextField
                    label={copy.from}
                    inputMode="numeric"
                    value={form.ratioFrom}
                    error={errors.ratioFrom}
                    onValueChange={(v) => change({ ratioFrom: v.replace(/\D/g, '') }, 'ratioFrom')}
                  />
                  <TextField
                    label={copy.to}
                    helper={copy.hint}
                    inputMode="numeric"
                    value={form.ratioTo}
                    error={errors.ratioTo}
                    onValueChange={(v) => change({ ratioTo: v.replace(/\D/g, '') }, 'ratioTo')}
                  />
                </div>
              </div>
              {merging ? (
                <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
                  {form.type === 'demerger' ? (
                    <TextField
                      label="Cost allocation % (Sec 49(2C))"
                      inputMode="decimal"
                      value={form.costAllocationPct}
                      error={errors.costAllocationPct}
                      onValueChange={(v) => change({ costAllocationPct: v }, 'costAllocationPct')}
                    />
                  ) : null}
                  <AmountField
                    label="Cash-in-lieu received"
                    prefix="₹"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form.cashInLieu}
                    {...amountExpressionProps(form.cashInLieu, (v) => change({ cashInLieu: v }))}
                  />
                </div>
              ) : null}
              <TextField label="Notes" value={form.notes} onValueChange={(v) => change({ notes: v })} />
              {formError ? (
                <Text variant="label" tone="danger" as="div">
                  {formError}
                </Text>
              ) : null}
              {previewKey ? <AfterSaving state={shownPreview} lines={lines} loading={settling} /> : null}
            </form>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
      {confirmingDelete && action ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open && !deleting) setConfirmingDelete(false);
          }}
          title="Delete corporate action?"
          description={`The ${action.type} ${ratioText(action.type, action.ratioFrom, action.ratioTo, true)} of ${instrumentLabel({ name: action.instrumentName, symbol: action.instrumentSymbol })} goes.`}
          impact={['Its quantity and cost change are taken back from the holding.', 'Your trades and dividends stay.']}
          confirmLabel="Delete corporate action"
          confirmLoading={deleting}
          onConfirm={() => void remove()}
        >
          <IrreversibleNote />
        </ConfirmDialog>
      ) : null}
    </>
  );
}

function AfterSaving({ state, lines, loading }: { state: PreviewState | null; lines: PreviewLine[]; loading: boolean }) {
  return (
    <Card variant="inset" title="After saving">
      {loading ? (
        <Text variant="label" tone="ink-3" as="div" className="px-space-8 py-space-8">
          Calculating…
        </Text>
      ) : null}
      {state?.status === 'error' ? (
        <Text variant="label" tone="danger" as="div" className="px-space-8 py-space-8">
          {state.message}
        </Text>
      ) : null}
      {state?.status === 'ready' && lines.length === 0 ? (
        <Text variant="label" tone="ink-3" as="div" className="px-space-8 py-space-8">
          You hold none of this instrument, so no quantity changes.
        </Text>
      ) : null}
      {state?.status === 'ready'
        ? lines.map((line) => (
            <ListRow key={line.key} title={line.label} subtitle={line.text} wrap />
          ))
        : null}
    </Card>
  );
}
