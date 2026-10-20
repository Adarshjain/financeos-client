'use client';

import React from 'react';

import { DateField, Select, type SelectOption, Text, TextField } from '@/components/ds';
import { BankLogo, SettingsToggle } from '@/components/organisms';
import { formatRupees } from '@/features/accounts/list/accountsList';
import { BANKS } from '@/features/banks/banks';
import type { CreditLimitPool } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import {
  type AccountFormValues,
  BROKER_PROVIDERS,
  FINANCIAL_POSITION_OPTIONS,
  type FormErrors,
  LIMIT_POOL_NEW,
  LIMIT_POOL_NONE,
  otherPoolMembersNote,
} from './accountFormModel';

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
}

const BANK_OPTIONS: SelectOption[] = BANKS.map((b) => ({
  value: b.id,
  label: b.name,
  searchText: b.aliases.join(' '),
  icon: <BankLogo bankId={b.id} name={b.name} />,
}));

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-space-12">
      <Text variant="overline" tone="ink-3" as="h3">
        {title}
      </Text>
      {children}
    </section>
  );
}

function Pair({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 desk:grid-cols-2 gap-space-12">{children}</div>;
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
      label: `${p.name} · ${formatRupees(p.creditLimit)}`,
      hint: `${p.memberCount} ${p.memberCount === 1 ? 'card' : 'cards'}`,
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
      value={values.statementPassword}
      onValueChange={(v) => onChange({ statementPassword: v })}
    />
  );

  return (
    <div className="flex flex-col gap-space-16">
      <Section title="Basics">
        <TextField
          label="Account name"
          placeholder={isBroker ? 'e.g., Zerodha Demat' : 'e.g., HDFC Savings'}
          autoComplete="off"
          error={errors.name}
          value={values.name}
          onValueChange={(v) => onChange({ name: v })}
        />
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

      {isCard ? (
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

      {isCard ? (
        <Section title="Limit">
          <Select
            label="Shared limit"
            helper="Some banks give several cards one limit · pick an existing one or create a new one"
            options={poolOptions}
            value={values.limitPoolChoice}
            onValueChange={(v) => onLimitPoolChoice(v as string)}
          />
          {pooled ? (
            <div className="flex flex-col gap-space-12">
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
          description="Leave this account out of totals"
          checked={values.excludeFromNetAsset}
          onCheckedChange={(checked) => onChange({ excludeFromNetAsset: checked })}
        />
      </Section>
    </div>
  );
}
