'use client';

import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { DateField } from '@/components/ds/DateField/DateField';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { Select } from '@/components/ds/Select/Select';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { Text } from '@/components/ds/Text/Text';
import { TextField } from '@/components/ds/TextField/TextField';
import { showToast } from '@/components/ds/Toast/Toast';
import { AmountField } from '@/components/organisms/AmountField/AmountField';
import { SettingsToggle } from '@/components/organisms/SettingsToggle/SettingsToggle';
import { amountExpressionProps, resolveAmountExpression } from '@/lib/amountExpression';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { watchSession } from '@/lib/authExpiry';
import { todayInAppZone } from '@/lib/date-range';
import { keys } from '@/lib/query/keys';

import { loadNpsFormOptions, type NpsFormOptions } from './npsActions';
import { tierTwoRows } from './npsEntryForm';
import {
  allocationRows,
  ASSET_CLASSES,
  type ClassPercents,
  CRA_LABEL,
  DEFAULT_PERCENTS,
  type NpsAccount,
  type NpsAccountRequest,
  type NpsAllocationRow,
  percentsTotal,
  pfmOptions,
  schemesOf,
  SECTOR_LABEL,
  variantOptions,
} from './npsModel';
import { useNpsMutations } from './useNpsMutations';

const FORM_ID = 'nps-account-form';

export interface NpsAccountDialogProps {
  /** The account being edited; none adds one. */
  account?: NpsAccount | null;
  /** The summary's allocation rows; edit mode copies the account's Tier I rows to Tier II when Tier II is turned on. */
  allocation?: NpsAllocationRow[];
  onClose: () => void;
}

/** Adds or edits an NPS account: the top bar's + and the empty tab's "Add by hand" open it, the Account card's Edit opens it on the account. */
export function NpsAccountDialog({ account = null, allocation = [], onClose }: NpsAccountDialogProps) {
  const query = useQuery({
    queryKey: [...keys.nps.all, 'form-options'],
    gcTime: 0,
    queryFn: async (): Promise<NpsFormOptions> => {
      const result = await watchSession(loadNpsFormOptions());
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });
  const title = account ? 'Edit NPS account' : 'Add NPS account';
  if (query.isPending || query.isError) {
    return (
      <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
        <Dialog.Content
          size="sm"
          title={title}
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
  return <NpsAccountForm account={account} allocation={allocation} options={query.data} onClose={onClose} title={title} />;
}

interface FormState {
  pran: string;
  relation: 'SELF' | 'CHILD';
  holderName: string;
  /** '' = not set (the statement didn't say). */
  sector: NonNullable<NpsAccountRequest['sector']> | '';
  employerId: string;
  cra: NonNullable<NpsAccountRequest['cra']>;
  pfm: string;
  variant: string;
  choice: string;
  percents: ClassPercents;
  balance: string;
  asOf: string;
  tier2: 'yes' | 'no';
  readGmail: boolean;
}

const WHOSE = [
  { value: 'SELF', label: 'Mine' },
  { value: 'CHILD', label: "A child's" },
];
const CHOICES = [
  { value: 'Active', label: 'Active' },
  { value: 'Auto', label: 'Auto' },
];
const TIER_TWO = [
  { value: 'no', label: 'Not now' },
  { value: 'yes', label: 'Add Tier II' },
];
const SECTOR_OPTIONS = (Object.keys(SECTOR_LABEL) as NonNullable<NpsAccountRequest['sector']>[]).map((value) => ({ value, label: SECTOR_LABEL[value] }));
/** The server can't clear a sector, so "Not set" is offered only while the account has none. */
const SECTORS_WITH_NOT_SET = [{ value: '', label: 'Not set' }, ...SECTOR_OPTIONS];
const CRAS = (Object.keys(CRA_LABEL) as FormState['cra'][]).map((value) => ({ value, label: CRA_LABEL[value] }));

function NpsAccountForm({ account, allocation, options, onClose, title }: { account: NpsAccount | null; allocation: NpsAllocationRow[]; options: NpsFormOptions; onClose: () => void; title: string }) {
  const editing = account !== null;
  const mutations = useNpsMutations();
  const today = todayInAppZone();
  const pfms = pfmOptions(options.schemes.filter((s) => s.tier === 'I'));
  const [form, setForm] = React.useState<FormState>({
    pran: '',
    relation: account?.relation ?? 'SELF',
    holderName: account?.relation === 'CHILD' ? account.holderName : '',
    sector: account ? (account.sector ?? '') : 'CORPORATE',
    employerId: account?.employer?.id ?? '',
    cra: account?.cra ?? 'PROTEAN',
    pfm: pfms[0]?.value ?? '',
    variant: '',
    choice: account?.schemeChoice ?? 'Active',
    percents: DEFAULT_PERCENTS,
    balance: '',
    asOf: today,
    tier2: account?.tier2Active ? 'yes' : 'no',
    readGmail: account?.readGmail ?? true,
  });
  /** The account a failed create left behind: a retry adds to it instead of hitting the duplicate PRAN. */
  const createdId = React.useRef<string | null>(null);
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  const variants = variantOptions(options.schemes, form.pfm, 'I');
  const variant = variants.some((v) => v.value === form.variant) ? form.variant : (variants[0]?.value ?? '');
  const total = percentsTotal(form.percents);
  const pending = mutations.createAccount.isPending || mutations.updateAccount.isPending || mutations.replaceAllocation.isPending || mutations.createEntry.isPending;

  const accountBody = (): NpsAccountRequest => ({
    ...(form.pran.trim() ? { pran: form.pran } : {}),
    // An edit of your own account leaves the name alone: the statement's real name would become "Me".
    ...(form.relation === 'CHILD' ? { holderName: form.holderName.trim() } : editing ? {} : { holderName: 'Me' }),
    relation: form.relation,
    sector: form.sector || null,
    cra: form.cra,
    ...(form.sector === 'CORPORATE' && form.employerId ? { employerId: form.employerId } : {}),
    readGmail: form.readGmail,
    tier2Active: form.tier2 === 'yes',
    ...(editing ? {} : { schemeChoice: form.choice }),
  });

  const submit = async () => {
    if (form.relation === 'CHILD' && !form.holderName.trim()) return void showToast("Enter the child's name.", { tone: 'danger' });
    if (!editing && !form.pran.trim()) return void showToast('Enter the PRAN.', { tone: 'danger' });
    try {
      if (account) {
        const turningOnTierTwo = form.tier2 === 'yes' && !account.tier2Active;
        let tierTwo: { schemeCode: string; percent: number }[] = [];
        if (turningOnTierTwo) {
          const tierOne = allocation.filter((a) => a.accountId === account.id && a.tier === 'I').map((a) => ({ schemeCode: a.schemeCode, percent: a.percent }));
          const first = options.schemes.find((s) => s.schemeCode === tierOne[0]?.schemeCode);
          const rows = first?.pfmCode && first.variant ? tierTwoRows(tierOne, options.schemes, first.pfmCode, first.variant) : null;
          if (!rows || rows.length === 0) return void showToast("This account's fund and plan has no Tier II scheme for every asset class. Choose Not now for Tier II.", { tone: 'danger' });
          tierTwo = rows;
        }
        // The allocation first: a failed one must not leave Tier II switched on without it.
        if (turningOnTierTwo) await mutations.replaceAllocation.mutateAsync({ id: account.id, body: { tier: 'II', choice: account.schemeChoice ?? form.choice, rows: tierTwo } });
        await mutations.updateAccount.mutateAsync({ id: account.id, body: accountBody() });
        showToast('Account updated');
      } else {
        const tierOne = schemesOf(options.schemes, form.pfm, variant, 'I');
        const rows = allocationRows(form.percents, tierOne);
        if (total !== 100) return void showToast('The percents must add up to 100.', { tone: 'danger' });
        if (!rows) return void showToast('This fund and plan has no scheme for an asset class with a percent. Pick another plan.', { tone: 'danger' });
        const balance = Number(resolveAmountExpression(form.balance)) || 0;
        const tierTwo = form.tier2 === 'yes' ? tierTwoRows(rows, options.schemes, form.pfm, variant) : [];
        if (!tierTwo) return void showToast('This fund and plan has no Tier II scheme for every asset class. Choose Not now for Tier II.', { tone: 'danger' });
        const created = createdId.current ? { id: createdId.current } : await mutations.createAccount.mutateAsync(accountBody());
        createdId.current = created.id;
        await mutations.replaceAllocation.mutateAsync({ id: created.id, body: { tier: 'I', choice: form.choice, rows } });
        if (tierTwo.length > 0) await mutations.replaceAllocation.mutateAsync({ id: created.id, body: { tier: 'II', choice: form.choice, rows: tierTwo } });
        // No lines: the server estimates the units from the allocation and the NAVs, and marks the entry Estimated.
        if (balance > 0) {
          await mutations.createEntry.mutateAsync({
            accountId: created.id,
            type: 'OPENING',
            tier: 'I',
            postedDate: form.asOf,
            amount: balance,
          });
        }
        showToast('Account added');
      }
      await mutations.refresh();
      onClose();
    } catch (e) {
      await mutations.refresh().catch(() => undefined);
      showToast(getErrorMessage(e, editing ? "Couldn't update the account. Try again." : "Couldn't add the account. Try again."), { tone: 'danger' });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="sm"
        title={title}
        description={editing ? undefined : 'Uploading a statement fills all of this for you.'}
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: pending }}
        primary={{ label: editing ? 'Save account' : 'Add account', type: 'submit', form: FORM_ID, loading: pending }}
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
            <TextField
              label="PRAN"
              inputMode="numeric"
              placeholder={account ? `••••••••${account.pranMasked.slice(-4)}` : '1100 2233 4821'}
              helper="Matches statements and emails. Shown as ••••4821."
              value={form.pran}
              onValueChange={(v) => set({ pran: v })}
            />
            <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
              <Select label="Whose account" options={WHOSE} value={form.relation} onValueChange={(v) => set({ relation: v as FormState['relation'] })} />
              {form.relation === 'CHILD' ? <TextField label="Child's name" value={form.holderName} onValueChange={(v) => set({ holderName: v })} /> : null}
              <Select label="Sector" options={account?.sector ? SECTOR_OPTIONS : SECTORS_WITH_NOT_SET} value={form.sector} onValueChange={(v) => set({ sector: v as FormState['sector'] })} />
              {form.sector === 'CORPORATE' ? (
                <Select
                  label="Employer"
                  options={options.employers.map((e) => ({ value: e.id, label: e.name }))}
                  value={form.employerId}
                  placeholder="Choose an employer"
                  onValueChange={(v) => set({ employerId: v as string })}
                />
              ) : null}
              <Select label="Record keeper (CRA)" options={CRAS} value={form.cra} onValueChange={(v) => set({ cra: v as FormState['cra'] })} />
            </div>
            {editing ? null : (
              <>
                <Text variant="body-strong" as="div">
                  Tier I
                </Text>
                <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
                  <Select label="Pension fund" options={pfms} value={form.pfm} searchable onValueChange={(v) => set({ pfm: v as string })} />
                  <Select label="Plan" options={variants} value={variant} helper="Direct, through a PoP, or government. Changes the NAV." onValueChange={(v) => set({ variant: v as string })} />
                  <Select label="Choice" options={CHOICES} value={form.choice} onValueChange={(v) => set({ choice: v as string })} />
                </div>
                <div className="grid grid-cols-4 gap-x-space-12">
                  {ASSET_CLASSES.map((c) => (
                    <TextField
                      key={c}
                      label={`${c} %`}
                      inputMode="decimal"
                      value={form.percents[c]}
                      error={total !== 100 && c === 'A' ? `Adds up to ${total}` : undefined}
                      onValueChange={(v) => set({ percents: { ...form.percents, [c]: v } })}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8">
                  <AmountField
                    label="Balance today (optional)"
                    inputMode="decimal"
                    placeholder="0.00"
                    helper="We estimate units from this until a statement gives the exact ones."
                    value={form.balance}
                    {...amountExpressionProps(form.balance, (v) => set({ balance: v }))}
                  />
                  <DateField label="As of" today={today} value={form.asOf} onValueChange={(v) => set({ asOf: typeof v === 'string' ? v : '' })} />
                </div>
              </>
            )}
            <Select label="Tier II" options={TIER_TWO} value={form.tier2} onValueChange={(v) => set({ tier2: v as FormState['tier2'] })} />
            <SettingsToggle
              label="Read NPS emails from Gmail"
              description="Adds each unit credit and picks up emailed statements."
              checked={form.readGmail}
              onCheckedChange={(v) => set({ readGmail: v })}
            />
          </form>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
