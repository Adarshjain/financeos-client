'use client';

import React from 'react';

import { Button, Checkbox, Icon, ListRow, Select, Text, TextField } from '@/components/ds';
import { TransactionRow } from '@/components/organisms';
import type { Account } from '@/lib/account.types';
import { formatDate, formatMoney } from '@/lib/format';
import type { LinkType, Transaction } from '@/lib/transaction.types';

import { pickerListItem } from '../pickerModel';
import { TransactionPickerField } from '../TransactionPickerField';
import { counterpartHint, counterpartRules, coverageLine, type LinkRole, roleLabel } from './linkModel';
import { type useLinkMembers } from './useLinkMembers';

type Members = ReturnType<typeof useLinkMembers>;

export interface TransactionsLinkBodyProps {
  type: LinkType;
  state: Members;
  accounts: readonly Account[];
  /** Several transactions came in from the selection: every row gets a role, and a coverage line shows. */
  multi: boolean;
}

const accountOf = (accounts: readonly Account[], id: string) => {
  const found = accounts.find((a) => a.id === id) as { name: string; last4?: string } | undefined;
  return { name: found?.name ?? 'Unknown', last4: found?.last4 };
};

/** Link between transactions: the members with their roles, a search for the other side, the note. */
export function TransactionsLinkBody({ type, state, accounts, multi }: TransactionsLinkBodyProps) {
  const { members, anchorId, add, remove, setRole, note, setNote, alignRefundCategories, setAlignRefundCategories } =
    state;
  const subject = members[0];
  const reference = members.find((m) => m.id === anchorId) ?? subject;

  const rules = React.useMemo(
    () => counterpartRules(type, reference, (id) => (accounts.find((a) => a.id === id)?.type as string) === 'credit_card'),
    [type, reference, accounts],
  );
  const accept = React.useCallback((t: { amount: number; accountId: string }) => rules.accept(t), [rules]);

  // One transaction: the dialog already names it, so the rows are the others picked so far.
  const rows: Transaction[] = multi ? members : members.slice(1);
  const coverage = coverageLine(type, members, anchorId);

  const noteField = (
    <TextField
      label="Note"
      optional
      placeholder="e.g. Monthly CC bill settlement"
      value={note}
      onValueChange={setNote}
    />
  );
  const alignRow =
    type === 'REFUND' ? (
      <ListRow
        role="checkbox"
        aria-checked={alignRefundCategories}
        aria-label="Align refund category to the purchase"
        className="px-0"
        onClick={() => setAlignRefundCategories(!alignRefundCategories)}
        leading={<Checkbox checked={alignRefundCategories} tabIndex={-1} aria-hidden="true" />}
        title="Align refund category to the purchase"
      />
    ) : null;

  const list =
    rows.length > 0 ? (
      <div className="flex flex-col">
        {rows.map((t) => {
          const item = pickerListItem(t, accountOf(accounts, t.accountId));
          const role: LinkRole = t.id === anchorId ? 'anchor' : 'member';
          const last4 = accountOf(accounts, t.accountId).last4;
          const amount = formatMoney(Math.abs(t.amount), { decimals: 'exact', symbol: false });
          return (
            <div key={t.id} className="flex items-center gap-space-8 border-t border-line-soft first:border-t-0">
              <TransactionRow
                compact
                borderTop={false}
                className="min-w-0 flex-1 px-0"
                description={item.title}
                date={formatDate(t.date, 'list')}
                account={accountOf(accounts, t.accountId).name}
                plastic={last4 ? `••${last4}` : undefined}
                provenance={multi ? undefined : roleLabel(type, role)}
                amount={item.isCredit ? `+${amount}` : amount}
                isCredit={item.isCredit}
              />
              {multi ? (
                <Select
                  size="sm"
                  aria-label={`Role of ${item.title}`}
                  value={role}
                  onValueChange={(v) => setRole(t.id, v as LinkRole)}
                  options={(['anchor', 'member'] as const).map((r) => ({ value: r, label: roleLabel(type, r) }))}
                />
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                iconOnly
                aria-label={`Remove ${item.title}`}
                onClick={() => remove(t.id)}
              >
                <Icon name="close" size="sm" />
              </Button>
            </div>
          );
        })}
      </div>
    ) : null;

  // These types link exactly two transactions: the picker goes once both are in, and returns when one is removed.
  const full = members.length >= 2 && (type === 'TRANSFER' || type === 'CC_PAYMENT' || type === 'REVERSAL');
  const picker = full ? null : (
    <TransactionPickerField
      label={multi ? 'Add more transactions' : 'Find the other side'}
      value={null}
      onSelect={add}
      onClear={() => undefined}
      type={rules.type}
      excludeAnyObligationRef
      accept={accept}
      ruleHint={counterpartHint(type)}
      suggestAmount={Math.abs(subject?.amount ?? 0) || null}
      suggestDate={subject?.date ?? null}
      excludeIds={members.map((m) => m.id)}
    />
  );

  return (
    <>
      {multi ? list : null}
      {multi && coverage ? (
        <Text variant="label" tone="ink-2" as="p">
          {coverage}
        </Text>
      ) : null}
      {multi ? null : noteField}
      {alignRow}
      {picker}
      {multi ? null : list}
      {!multi && coverage ? (
        <Text variant="label" tone="ink-2" as="p">
          {coverage}
        </Text>
      ) : null}
      {multi ? noteField : null}
    </>
  );
}
