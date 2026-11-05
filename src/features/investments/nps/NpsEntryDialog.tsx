'use client';

import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { DateField } from '@/components/ds/DateField/DateField';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Select } from '@/components/ds/Select/Select';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { Text } from '@/components/ds/Text/Text';
import { TextField } from '@/components/ds/TextField/TextField';
import { showToast } from '@/components/ds/Toast/Toast';
import { AmountField } from '@/components/organisms/AmountField/AmountField';
import { amountExpressionProps, resolveAmountExpression } from '@/lib/amountExpression';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { watchSession } from '@/lib/authExpiry';
import { todayInAppZone } from '@/lib/date-range';
import { formatMoney, formatPercent } from '@/lib/format';
import { keys } from '@/lib/query/keys';

import { loadNpsFormOptions, type NpsFormOptions } from './npsActions';
import { emptyEntryForm, entryRequest, type NpsEntryFormState, unitsRows, unitsText } from './npsEntryForm';
import { ENTRY_TYPE_OPTIONS, type NpsAccount, type NpsSummary, tierLabel } from './npsModel';
import { useNpsMutations } from './useNpsMutations';

const FORM_ID = 'nps-entry-form';

export interface NpsEntryDialogProps {
  summary: NpsSummary;
  /** The account the form starts on. */
  accountId: string;
  onClose: () => void;
}

/** Records an NPS entry. Loads the scheme NAVs, then shows the form. */
export function NpsEntryDialog({ summary, accountId, onClose }: NpsEntryDialogProps) {
  const query = useQuery({
    queryKey: [...keys.nps.all, 'form-options'],
    gcTime: 0,
    queryFn: async (): Promise<NpsFormOptions> => {
      const result = await watchSession(loadNpsFormOptions());
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });
  if (query.isPending || query.isError) {
    return (
      <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
        <Dialog.Content
          size="sm"
          title="Record NPS entry"
          description={query.isError ? "Couldn't load the NPS schemes. Close this and try again." : undefined}
          secondary={{ label: query.isError ? 'Close' : 'Cancel', onSelect: onClose }}
        >
          <Dialog.Body>
            {query.isError ? null : (
              <div className="flex flex-col gap-space-8 desk:gap-space-12">
                <Skeleton height={32} />
                <Skeleton height={32} />
                <Skeleton height={32} />
              </div>
            )}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    );
  }
  return <NpsEntryForm summary={summary} accountId={accountId} schemes={query.data.schemes} onClose={onClose} />;
}

function accountLabel(a: NpsAccount): string {
  return `${a.relation === 'CHILD' ? a.holderName : 'Mine'} ••${a.pranMasked.slice(-4)}`;
}

function NpsEntryForm({ summary, accountId, schemes, onClose }: NpsEntryDialogProps & { schemes: NpsFormOptions['schemes'] }) {
  const mutations = useNpsMutations();
  const today = todayInAppZone();
  const [form, setForm] = React.useState<NpsEntryFormState>(() => emptyEntryForm(accountId, today));
  const set = (patch: Partial<NpsEntryFormState>) => setForm((f) => ({ ...f, ...patch }));
  const account = summary.accounts.find((a) => a.id === form.accountId) ?? summary.accounts[0];
  const allocation = summary.allocation
    .filter((a) => a.accountId === account.id && a.tier === form.tier)
    .map((a) => ({ schemeCode: a.schemeCode, percent: a.percent }))
    .sort((a, b) => a.schemeCode.localeCompare(b.schemeCode));
  const rows = unitsRows(form, allocation, schemes);
  const nameOf = (code: string) => schemes.find((s) => s.schemeCode === code);
  const tierOptions = [{ value: 'I', label: tierLabel('I') }, ...(account.tier2Active ? [{ value: 'II', label: tierLabel('II') }] : [])];
  const isSwitch = form.type === 'SWITCH';

  const submit = async () => {
    const resolved = { ...form, amount: resolveAmountExpression(form.amount) };
    setForm(resolved);
    const result = entryRequest(resolved, unitsRows(resolved, allocation, schemes), schemes);
    if ('error' in result) {
      showToast(result.error, { tone: 'danger' });
      return;
    }
    try {
      await mutations.createEntry.mutateAsync(result.body);
      showToast('Entry added');
      await mutations.refresh();
      onClose();
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't save the entry. Try again."), { tone: 'danger' });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="sm"
        title="Record NPS entry"
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: mutations.createEntry.isPending }}
        primary={{ label: 'Save entry', type: 'submit', form: FORM_ID, loading: mutations.createEntry.isPending }}
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
            {summary.accounts.length > 1 ? (
              <Select
                label="Account"
                options={summary.accounts.map((a) => ({ value: a.id, label: accountLabel(a) }))}
                value={form.accountId}
                onValueChange={(v) => set({ accountId: v as string, tier: 'I', units: {} })}
              />
            ) : null}
            <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
              <Select
                label="Type"
                options={ENTRY_TYPE_OPTIONS}
                value={form.type}
                onValueChange={(v) => set({ type: v as NpsEntryFormState['type'], units: {} })}
              />
              {form.type === 'CONTRIBUTION' ? (
                <Select
                  label="From"
                  options={[
                    { value: 'SELF', label: 'You' },
                    { value: 'EMPLOYER', label: 'Employer' },
                  ]}
                  value={form.contributor}
                  onValueChange={(v) => set({ contributor: v as NpsEntryFormState['contributor'] })}
                />
              ) : null}
              <Select label="Tier" options={tierOptions} value={form.tier} onValueChange={(v) => set({ tier: v as NpsEntryFormState['tier'], units: {} })} />
              <DateField label="Date" today={today} value={form.date} onValueChange={(v) => set({ date: typeof v === 'string' ? v : '' })} />
            </div>
            {isSwitch ? null : (
              <AmountField
                label="Amount"
                inputMode="decimal"
                placeholder="0.00"
                value={form.amount}
                {...amountExpressionProps(form.amount, (v) => set({ amount: v, units: {} }))}
              />
            )}
            {rows.length > 0 ? (
              <div className="flex flex-col">
                <Text variant="label" tone="ink-3" as="div">
                  {isSwitch ? 'Units · type them in, with a minus for the scheme you leave' : 'Units · from your allocation and the latest NAV'}
                </Text>
                {rows.map((r) => {
                  const scheme = nameOf(r.schemeCode);
                  return (
                    <ListRow
                      key={r.schemeCode}
                      className="px-0"
                      title={`${scheme?.name ?? r.schemeCode} · ${formatPercent(r.percent, { decimals: 0 })}`}
                      subtitle={r.nav ? `${isSwitch ? '' : `${formatMoney(r.part, { decimals: 'auto' })} ÷ `}${formatMoney(r.nav, { decimals: 'unit' })}` : "NAV isn't out yet"}
                      trailing={
                        <TextField
                          aria-label={`Units of ${scheme?.name ?? r.schemeCode}`}
                          inputMode="decimal"
                          align="right"
                          value={unitsText(r, form.units)}
                          onValueChange={(v) => set({ units: { ...form.units, [r.schemeCode]: v } })}
                        />
                      }
                    />
                  );
                })}
                <Text variant="label" tone="ink-3" as="div">
                  Units are estimated and editable. A statement replaces them with the exact ones.
                </Text>
              </div>
            ) : (
              <Text variant="label" tone="ink-3" as="div">
                This account has no allocation for {tierLabel(form.tier)} yet.
              </Text>
            )}
            <TextField label="Note" placeholder="Optional" value={form.note} onValueChange={(v) => set({ note: v })} />
          </form>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
