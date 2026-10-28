'use client';

import React from 'react';

import {
  Banner,
  Checkbox,
  ConfirmDialog,
  DateField,
  Dialog,
  DialogBody,
  DialogContent,
  ListRow,
  Select,
  showToast,
  Text,
  TextField,
} from '@/components/ds';
import { AmountField } from '@/components/organisms';
import { amountExpressionProps, resolveAmountExpression } from '@/lib/amountExpression';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { todayInAppZone } from '@/lib/date-range';
import { formatDate, formatMoney } from '@/lib/format';

import { EpfCreditSection } from './EpfCreditSection';
import { EpfEmployerDialog } from './EpfEmployerDialog';
import {
  emptyForm,
  entryTitle,
  entryToForm,
  type EpfEmployer,
  type EpfEntry,
  type EpfEntryType,
  type EpfFormState,
  epfFyLabel,
  type EpfLatestContribution,
  fieldsOf,
  formFromLatestContribution,
  formToRequest,
  interestFyOptions,
  KIND_OPTIONS,
  receivedCaption,
  TYPE_LABEL,
  TYPE_OPTIONS,
  wageMonthOptions,
} from './epfModel';
import { useEpfMutations } from './useEpfMutations';

const FORM_ID = 'epf-entry-form';

export interface EpfEntryDialogProps {
  /** The entry being opened; none adds one. */
  entry?: EpfEntry | null;
  employers: EpfEmployer[];
  /** The newest contribution, which a new contribution is filled from. */
  latestContribution?: EpfLatestContribution | null;
  /** The type a new entry opens on (a contribution by default). */
  initialType?: EpfEntryType;
  onClose: () => void;
  /** Called after a save, a delete or a change to the bank credit. */
  onChanged?: () => void;
}

/** The default employer of a new entry: the current one, else the first. */
function defaultEmployerId(employers: EpfEmployer[]): string {
  return (employers.find((e) => e.status === 'CURRENT') ?? employers[0])?.id ?? '';
}

/**
 * Adds or opens an EPF entry. The fields follow the type (and the withdrawal kind). An entry imported from a passbook is
 * read-only, except a withdrawal's TDS, note and bank credit.
 */
export function EpfEntryDialog({ entry = null, employers, latestContribution = null, initialType, onClose, onChanged }: EpfEntryDialogProps) {
  const editing = entry !== null;
  const imported = entry?.source === 'PASSBOOK';
  const importedWithdrawal = imported && entry?.type === 'WITHDRAWAL';
  const today = todayInAppZone();
  const mutations = useEpfMutations();

  const prefilled = !editing && latestContribution !== null && (initialType ?? 'CONTRIBUTION') === 'CONTRIBUTION';
  const [form, setForm] = React.useState<EpfFormState>(() => {
    if (entry) return entryToForm(entry);
    const base = { ...emptyForm(defaultEmployerId(employers), today), type: initialType ?? 'CONTRIBUTION' };
    return prefilled && latestContribution ? { ...base, ...formFromLatestContribution(latestContribution, base.employerId || latestContribution.employerId) } : base;
  });
  const [extraEmployers, setExtraEmployers] = React.useState<EpfEmployer[]>([]);
  const [addingEmployer, setAddingEmployer] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  // An employer added here appears in `employers` after the page re-reads; list it once.
  const allEmployers = [...employers, ...extraEmployers.filter((x) => !employers.some((e) => e.id === x.id))];
  const set = (patch: Partial<EpfFormState>) => setForm((f) => ({ ...f, ...patch }));
  /** A final settlement takes the employer's whole balance, split as the passbook has it. */
  const settleShares = (employerId: string): Partial<EpfFormState> => {
    const found = allEmployers.find((e) => e.id === employerId);
    return found && !editing ? { employee: String(found.employeeBalance), employer: String(found.employerBalance) } : {};
  };
  const f = fieldsOf(form);
  // A link that recorded TDS changes the entry's TDS; the form follows it, and keeps its other unsaved edits.
  const savedTds = entry?.tdsAmount ?? 0;
  React.useEffect(() => {
    setForm((f) => ({ ...f, tdsOn: savedTds > 0, tds: savedTds > 0 ? String(savedTds) : '' }));
  }, [savedTds]);
  const employerName = allEmployers.find((e) => e.id === form.employerId)?.name ?? '';
  const pending = mutations.createEntry.isPending || mutations.updateEntry.isPending;
  const locked = imported;
  const amountLocked = locked;
  const tdsLocked = locked && !importedWithdrawal;

  const employerOptions = allEmployers.map((e) => ({ value: e.id, label: e.name }));
  const typeOptions =
    entry?.type === 'TRANSFER_OUT' ? [...TYPE_OPTIONS, { value: 'TRANSFER_OUT' as const, label: TYPE_LABEL.TRANSFER_OUT }] : TYPE_OPTIONS;
  const addEmployerAction = locked ? undefined : [{ label: 'Add employer', onSelect: () => setAddingEmployer(true) }];

  const done = async (message: string) => {
    showToast(message);
    await mutations.refresh();
    onChanged?.();
    onClose();
  };

  const submit = async () => {
    const resolved = {
      ...form,
      employee: resolveAmountExpression(form.employee),
      employer: resolveAmountExpression(form.employer),
      pension: resolveAmountExpression(form.pension),
      amount: resolveAmountExpression(form.amount),
      tds: resolveAmountExpression(form.tds),
    };
    setForm(resolved);
    const result = formToRequest(resolved);
    if ('error' in result) {
      showToast(result.error, { tone: 'danger' });
      return;
    }
    // An imported withdrawal keeps every field it came with; only the TDS and the note go.
    const body = imported && entry ? { ...result.body, note: resolved.note.trim() || null } : result.body;
    try {
      if (entry) {
        await mutations.updateEntry.mutateAsync({ id: entry.id, body });
        await done('Entry updated');
      } else {
        await mutations.createEntry.mutateAsync(body);
        await done('Entry added');
      }
    } catch (e) {
      showToast(getErrorMessage(e, editing ? 'Failed to update the entry' : 'Failed to add the entry'), { tone: 'danger' });
    }
  };

  const importedOn = entry?.importedAt ? formatDate(entry.importedAt.slice(0, 10), 'list') : '';
  const sharesHelper =
    form.type === 'OPENING_BALANCE'
      ? 'Use the closing balance from your last passbook. Later entries add to it.'
      : form.type === 'INTEREST'
        ? form.interestFy
          ? `Replaces the estimate for ${epfFyLabel(Number(form.interestFy))}.`
          : undefined
        : form.type === 'TRANSFER_IN'
          ? "The old employer's balance moves to the new one. The total does not change."
          : undefined;
  const pensionHelper = prefilled
    ? 'Filled from your last contribution. Pension is not added to the balance.'
    : editing && !imported && entry?.type === 'CONTRIBUTION'
      ? 'Added by you. A passbook that has this month replaces it.'
      : undefined;

  const amountField = (label: string, key: 'employee' | 'employer' | 'pension' | 'amount' | 'tds', helper?: React.ReactNode, disabled?: boolean) => (
    <AmountField
      label={label}
      inputMode="decimal"
      placeholder="0.00"
      helper={helper}
      disabled={disabled}
      value={form[key]}
      {...amountExpressionProps(form[key], (v) => set({ [key]: v } as Partial<EpfFormState>))}
    />
  );

  const showShares = f.shares;
  const lastShareHelper = form.type === 'CONTRIBUTION' ? undefined : sharesHelper;
  const showNote = f.note || (importedWithdrawal && f.tds);
  const showFooterDelete = editing && !imported;
  const footerPrimary =
    imported && !importedWithdrawal
      ? undefined
      : { label: editing ? 'Save' : 'Add entry', type: 'submit' as const, form: FORM_ID, loading: pending };

  return (
    <>
      <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
        <DialogContent
          size="sm"
          title={entry ? entryTitle(entry) : 'Add EPF entry'}
          tertiary={showFooterDelete ? { label: 'Delete entry', tone: 'danger', onSelect: () => setConfirmingDelete(true), disabled: pending } : undefined}
          secondary={{ label: imported && !importedWithdrawal ? 'Close' : 'Cancel', onSelect: onClose, disabled: pending }}
          primary={footerPrimary}
        >
          <DialogBody>
            <div className="flex flex-col gap-space-8 desk:gap-space-16">
              {imported ? (
                <Banner tone="info">
                  {`From the passbook${importedOn ? ` imported on ${importedOn}` : ''}. ${
                    importedWithdrawal ? 'Only TDS, the note and the link can change.' : 'Upload a newer passbook to change it.'
                  }`}
                </Banner>
              ) : null}
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
                  <Select
                    label="Type"
                    options={typeOptions}
                    value={form.type}
                    disabled={locked || form.type === 'TRANSFER_OUT'}
                    onValueChange={(v) => set({ type: v as EpfFormState['type'] })}
                  />
                  {f.kind ? (
                    <Select
                      label="Kind"
                      options={KIND_OPTIONS}
                      value={form.kind}
                      disabled={locked}
                      onValueChange={(v) => set({ kind: v as EpfFormState['kind'], ...(v === 'FINAL_SETTLEMENT' ? settleShares(form.employerId) : {}) })}
                    />
                  ) : null}
                </div>
                {importedWithdrawal ? null : (
                  <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
                    <Select
                      label={f.employerLabel}
                      options={employerOptions}
                      value={form.employerId}
                      disabled={locked || form.type === 'TRANSFER_OUT'}
                      actions={addEmployerAction}
                      onValueChange={(v) => set({ employerId: v as string, ...(form.type === 'WITHDRAWAL' && form.kind === 'FINAL_SETTLEMENT' ? settleShares(v as string) : {}) })}
                    />
                    {f.from ? (
                      <Select
                        label={form.type === 'TRANSFER_OUT' ? 'To employer' : 'From employer'}
                        options={employerOptions.filter((o) => o.value !== form.employerId)}
                        value={form.fromEmployerId}
                        placeholder="Choose an employer"
                        disabled={locked || form.type === 'TRANSFER_OUT'}
                        onValueChange={(v) => set({ fromEmployerId: v as string })}
                      />
                    ) : null}
                    {f.wageMonth ? (
                      <Select
                        label="Wage month"
                        options={wageMonthOptions(today, form.wageMonth)}
                        value={form.wageMonth}
                        searchable
                        disabled={locked}
                        onValueChange={(v) => set({ wageMonth: v as string })}
                      />
                    ) : null}
                    {f.interestFy ? (
                      <Select
                        label="For year"
                        options={interestFyOptions(today, form.interestFy)}
                        value={form.interestFy}
                        disabled={locked}
                        onValueChange={(v) => set({ interestFy: v as string })}
                      />
                    ) : null}
                    <DateField
                      label={f.dateLabel}
                      today={today}
                      value={form.creditedOn}
                      disabled={locked}
                      onValueChange={(v) => set({ creditedOn: typeof v === 'string' ? v : '' })}
                    />
                  </div>
                )}
                {showShares ? (
                  <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
                    {amountField('Your share', 'employee', undefined, amountLocked)}
                    {amountField('Employer share', 'employer', lastShareHelper, amountLocked)}
                  </div>
                ) : null}
                {f.pensionShare ? amountField('Pension (EPS)', 'pension', pensionHelper, amountLocked) : null}
                {f.amount ? amountField('Amount', 'amount', undefined, amountLocked) : null}
                {showNote ? (
                  <TextField label="Note" placeholder="Optional" value={form.note} onValueChange={(v) => set({ note: v })} />
                ) : null}
                {f.tds ? (
                  <>
                    <ListRow
                      className="px-0"
                      leading={
                        <Checkbox id="epf-tds-on" checked={form.tdsOn} disabled={tdsLocked} onCheckedChange={(on) => set({ tdsOn: on === true })} />
                      }
                      title={<label htmlFor="epf-tds-on">TDS was deducted</label>}
                    />
                    {form.tdsOn ? amountField('TDS', 'tds', undefined, tdsLocked) : null}
                    {importedWithdrawal ? null : (
                      <Text variant="label" tone="ink-3" as="div">
                        {receivedCaption(form, employerName)}
                      </Text>
                    )}
                  </>
                ) : null}
              </form>
              {entry && entry.type === 'WITHDRAWAL' ? (
                <EpfCreditSection key={`${entry.id}-${entry.transaction?.id ?? ''}-${entry.suggestion?.id ?? ''}`} entry={entry} mutations={mutations} onChanged={onChanged} />
              ) : null}
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {entry ? (
        <ConfirmDialog
          open={confirmingDelete}
          onOpenChange={(open) => {
            if (!mutations.deleteEntry.isPending) setConfirmingDelete(open);
          }}
          title={`Delete the ${entryTitle(entry)}?`}
          description={`This entry you added goes${
            entry.type === 'WITHDRAWAL' || entry.type === 'TRANSFER_OUT' ? '' : `, and the balance drops by ${formatMoney(entry.employeeAmount + entry.employerAmount, { decimals: 'auto' })}`
          }. Entries from the passbook stay.`}
          confirmLabel="Delete entry"
          confirmLoading={mutations.deleteEntry.isPending}
          onConfirm={() => {
            void (async () => {
              try {
                await mutations.deleteEntry.mutateAsync(entry.id);
                setConfirmingDelete(false);
                await done('Entry deleted');
              } catch (e) {
                showToast(getErrorMessage(e, 'Failed to delete the entry'), { tone: 'danger' });
              }
            })();
          }}
        />
      ) : null}
      {addingEmployer ? (
        <EpfEmployerDialog
          onClose={() => setAddingEmployer(false)}
          onSaved={(employer) => {
            setExtraEmployers((list) => [...list, employer]);
            set({ employerId: employer.id });
          }}
        />
      ) : null}
    </>
  );
}
