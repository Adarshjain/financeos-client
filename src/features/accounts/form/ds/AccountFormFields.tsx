'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { DateField } from '@/components/ds/DateField/DateField';
import { Select, type SelectOption } from '@/components/ds/Select/Select';
import { Text } from '@/components/ds/Text/Text';
import { TextField } from '@/components/ds/TextField/TextField';
import { BankLogo } from '@/components/organisms/BankLogo/BankLogo';
import { SettingsToggle } from '@/components/organisms/SettingsToggle/SettingsToggle';
import { BANKS } from '@/features/banks/banks';
import type { CreditLimitPool } from '@/lib/account.types';
import { resolveAmountExpression } from '@/lib/amountExpression';
import { formatCount, formatMoney } from '@/lib/format';
import { AccountType } from '@/lib/types';

import { CreditCardsFields, DebitCardFields } from './AccountCardsFields';
import {
  type AccountFormValues,
  BROKER_PROVIDERS,
  FINANCIAL_POSITION_OPTIONS,
  type FormErrors,
  LIMIT_POOL_NEW,
  LIMIT_POOL_NONE,
  otherPoolMembersNote,
} from './accountFormModel';
import { FROM_EMAIL_CAPTION, type NameHint, type PrefilledFields } from './suggestionPrefill';

export interface AccountFormFieldsProps {
  values: AccountFormValues;
  errors: FormErrors;
  isEdit: boolean;
  today: string;
  pools: CreditLimitPool[];
  /** Other accounts sharing the picked pool, without the one being edited. */
  poolOthers: number;
  identifiersLoading: boolean;
  identifierError: string | null;
  /** The stored identifier values plus anything added in this form, as Select options. */
  identifierOptions: SelectOption[];
  onChange: (patch: Partial<AccountFormValues>) => void;
  onLimitPoolChoice: (choice: string) => void;
  onCreateIdentifier: (raw: string) => void;
  onIdentifiersChange: (values: string[]) => void;
  /** Add from a suggestion: the fields that were filled in get the "From your email" caption. */
  prefilled?: PrefilledFields;
  /** Add from a suggestion: the values it filled in; a caption shows only while its field still holds one. */
  prefilledValues?: Pick<AccountFormValues, 'name' | 'bank' | 'last4' | 'creditLimit'>;
  /** Add from a suggestion: the card names the emails mention, each one tappable to use as the name. */
  nameHints?: NameHint[];
  /** Add from a suggestion: what the statements show of the credit limit when they give a range. */
  limitHint?: string | null;
  /** Add from a suggestion: shown under the statement password while it is empty. */
  passwordCaption?: string | null;
}

/** "Your emails mention A and B. Tap one to use it." with each name a link. */
function NameHints({ hints, onPick }: { hints: NameHint[]; onPick: (name: string) => void }) {
  return (
    <Text variant="caption" tone="ink-3" as="p">
      {hints.length === 1 ? 'Maybe ' : 'Your emails mention '}
      {hints.map((hint, i) => (
        <React.Fragment key={hint.candidate}>
          {i === 0 ? '' : i === hints.length - 1 ? ' and ' : ', '}
          <Button variant="link" type="button" onClick={() => onPick(hint.name)}>
            {hint.candidate}
          </Button>
        </React.Fragment>
      ))}
      {hints.length === 1 ? '. Tap it to use it.' : '. Tap one to use it.'}
    </Text>
  );
}

const BANK_OPTIONS: SelectOption[] = BANKS.map((b) => ({
  value: b.id,
  label: b.name,
  searchText: b.aliases.join(' '),
  icon: <BankLogo bankId={b.id} name={b.name} />,
}));

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-space-8 desk:gap-space-12">
      <Text variant="overline" tone="ink-3" as="h3">
        {title}
      </Text>
      {children}
    </section>
  );
}

function Pair({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 desk:grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">{children}</div>;
}

function AmountField({
  label,
  value,
  error,
  optional,
  placeholder,
  helper,
  onValueChange,
}: {
  label: string;
  value: string;
  error?: string;
  optional?: boolean;
  placeholder?: string;
  helper?: string;
  onValueChange: (v: string) => void;
}) {
  return (
    <TextField
      label={label}
      optional={optional}
      prefix="₹"
      inputMode="decimal"
      placeholder={placeholder}
      helper={helper}
      error={error}
      value={value}
      onValueChange={onValueChange}
      onBlur={() => {
        const resolved = resolveAmountExpression(value, { allowNegative: true });
        if (resolved !== value) onValueChange(resolved);
      }}
    />
  );
}

export function AccountFormFields({
  values,
  errors,
  isEdit,
  today,
  pools,
  poolOthers,
  identifiersLoading,
  identifierError,
  identifierOptions,
  onChange,
  onLimitPoolChoice,
  onCreateIdentifier,
  onIdentifiersChange,
  prefilled,
  prefilledValues,
  nameHints = [],
  limitHint,
  passwordCaption,
}: AccountFormFieldsProps) {
  const type = values.type;
  if (!type) return null;
  const isBank = type === AccountType.BANK_ACCOUNT;
  const isCard = type === AccountType.CREDIT_CARD;
  const isBroker = type === AccountType.BROKER;
  const syncs = isBank || isCard;
  const pooled = values.limitPoolChoice !== LIMIT_POOL_NONE;
  const noun = isCard ? 'card' : 'account';

  const poolOptions: SelectOption[] = [
    { value: LIMIT_POOL_NONE, label: 'None, this card has its own limit' },
    ...pools.map((p) => ({
      value: p.id,
      label: `${p.name} · ${formatMoney(p.creditLimit)}`,
      hint: formatCount(p.memberCount, ['card', 'cards']),
    })),
    { value: LIMIT_POOL_NEW, label: 'New shared limit…' },
  ];

  const providerOptions: SelectOption[] = [
    ...new Set([...(values.provider ? [values.provider] : []), ...BROKER_PROVIDERS]),
  ].map((p) => ({ value: p, label: p }));

  const password = (
    <TextField
      label="Statement PDF password"
      optional
      type="password"
      autoComplete="new-password"
      placeholder="If the PDF is protected"
      helper={passwordCaption && !values.statementPassword ? passwordCaption : undefined}
      value={values.statementPassword}
      onValueChange={(v) => onChange({ statementPassword: v })}
    />
  );

  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Section title="Basics">
        <TextField
          label="Account name"
          placeholder={isBroker ? 'e.g., Zerodha Demat' : 'e.g., HDFC Savings'}
          autoComplete="off"
          helper={prefilled?.name && values.name === prefilledValues?.name ? FROM_EMAIL_CAPTION : undefined}
          error={errors.name}
          value={values.name}
          onValueChange={(v) => onChange({ name: v })}
        />
        {nameHints.length >= 1 ? <NameHints hints={nameHints} onPick={(name) => onChange({ name })} /> : null}
        <TextField
          label="Description"
          optional
          placeholder="e.g., Primary spends card"
          autoComplete="off"
          value={values.description}
          onValueChange={(v) => onChange({ description: v })}
        />
        {syncs ? (
          <Select
            label="Bank"
            placeholder="Select a bank"
            searchable
            searchPlaceholder="Search banks…"
            options={BANK_OPTIONS}
            value={values.bank}
            helper={prefilled?.bank && values.bank === prefilledValues?.bank ? FROM_EMAIL_CAPTION : undefined}
            error={errors.bank}
            onValueChange={(v) => onChange({ bank: v as string })}
          />
        ) : null}
        {isBank ? (
          <Pair>
            <AmountField
              label="Opening balance"
              optional
              placeholder="0.00"
              value={values.openingBalance}
              error={errors.openingBalance}
              onValueChange={(v) => onChange({ openingBalance: v })}
            />
            <TextField
              label="Last 4 digits"
              optional
              inputMode="numeric"
              maxLength={4}
              placeholder="1234"
              helper={prefilled?.last4 && values.last4 === prefilledValues?.last4 ? FROM_EMAIL_CAPTION : undefined}
              error={errors.last4}
              value={values.last4}
              onValueChange={(v) => onChange({ last4: v })}
            />
          </Pair>
        ) : null}
        {isBroker ? (
          <>
            <Select
              label="Provider"
              placeholder="Select or type a provider"
              searchable
              options={providerOptions}
              value={values.provider}
              error={errors.provider}
              onValueChange={(v) => onChange({ provider: v as string })}
              onCreate={(q) => onChange({ provider: q })}
            />
            <Pair>
              <TextField
                label="Client ID"
                optional
                placeholder="e.g. AB1234"
                value={values.clientId}
                onValueChange={(v) => onChange({ clientId: v })}
              />
              <AmountField
                label="Uninvested cash balance"
                optional
                placeholder="0.00"
                value={values.cashBalance}
                error={errors.cashBalance}
                onValueChange={(v) => onChange({ cashBalance: v })}
              />
            </Pair>
          </>
        ) : null}
      </Section>

      {isCard && isEdit ? (
        <Section title="Card details">
          <Pair>
            <TextField
              label="Last 4 digits"
              inputMode="numeric"
              maxLength={4}
              placeholder="1234"
              error={errors.last4}
              value={values.last4}
              onValueChange={(v) => onChange({ last4: v })}
            />
            <DateField
              label="Card anniversary"
              today={today}
              error={errors.anniversaryDate}
              value={values.anniversaryDate}
              onValueChange={(v) => onChange({ anniversaryDate: v as string })}
            />
          </Pair>
          {password}
        </Section>
      ) : null}

      {isCard && !isEdit ? (
        <Section title="Cards">
          <CreditCardsFields values={values} errors={errors} today={today} prefilled={prefilled} prefilledLast4={prefilledValues?.last4} onChange={onChange} />
          {password}
        </Section>
      ) : null}

      {isBank && !isEdit ? (
        <Section title="Your debit card">
          <DebitCardFields values={values} errors={errors} prefilled={prefilled} onChange={onChange} />
        </Section>
      ) : null}

      {isCard ? (
        <Section title="Limit">
          <Select
            label="Shared limit"
            helper="Some banks give several cards one limit · pick an existing one or create a new one."
            options={poolOptions}
            value={values.limitPoolChoice}
            onValueChange={(v) => onLimitPoolChoice(v as string)}
          />
          {pooled ? (
            <div className="flex flex-col gap-space-8 desk:gap-space-12">
              <Pair>
                <TextField
                  label="Shared limit name"
                  maxLength={150}
                  placeholder="e.g. HDFC cards"
                  error={errors.limitPoolName}
                  value={values.limitPoolName}
                  onValueChange={(v) => onChange({ limitPoolName: v })}
                />
                <AmountField
                  label="Shared limit amount"
                  placeholder="5,00,000"
                  value={values.limitPoolLimit}
                  error={errors.limitPoolLimit}
                  onValueChange={(v) => onChange({ limitPoolLimit: v })}
                />
              </Pair>
              {poolOthers > 0 ? (
                <Text variant="caption" tone="warning" as="p">
                  {otherPoolMembersNote(poolOthers)}
                </Text>
              ) : null}
            </div>
          ) : null}
          {!pooled ? (
            <AmountField
              label="Credit limit"
              placeholder="50,000"
              helper={
                prefilled?.creditLimit && values.creditLimit === prefilledValues?.creditLimit
                  ? FROM_EMAIL_CAPTION
                  : (limitHint ?? undefined)
              }
              value={values.creditLimit}
              error={errors.creditLimit}
              onValueChange={(v) => onChange({ creditLimit: v })}
            />
          ) : null}
        </Section>
      ) : null}

      <Section title={syncs ? 'Sync & net worth' : 'Net worth'}>
        {isBank ? password : null}
        <Pair>
          <Select
            label="Financial position"
            options={FINANCIAL_POSITION_OPTIONS}
            value={values.financialPosition}
            onValueChange={(v) => onChange({ financialPosition: v as AccountFormValues['financialPosition'] })}
          />
          {syncs ? (
            <DateField
              label="Import emails from"
              helper={
                isEdit
                  ? `Leave the date empty to pause Gmail import for this ${noun}.`
                  : `Leave empty to pause Gmail import for this ${noun}.`
              }
              today={today}
              value={values.ingestFromDate}
              onValueChange={(v) => onChange({ ingestFromDate: v as string })}
            />
          ) : null}
        </Pair>
        {syncs ? (
          <Select
            label="Account identifiers"
            helper="Used to match emails to this account, along with the last 4 digits above."
            placeholder="e.g. 1234 or CRN"
            multiple
            searchable
            options={identifierOptions}
            value={values.identifiers}
            loading={identifiersLoading}
            error={identifierError ?? undefined}
            onValueChange={(v) => onIdentifiersChange(v as string[])}
            onCreate={onCreateIdentifier}
          />
        ) : null}
        <SettingsToggle
          label="Exclude from net worth"
          description="Leave this account out of totals."
          checked={values.excludeFromNetAsset}
          onCheckedChange={(checked) => onChange({ excludeFromNetAsset: checked })}
        />
      </Section>
    </div>
  );
}
