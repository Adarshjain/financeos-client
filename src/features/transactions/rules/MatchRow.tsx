'use client';

import React from 'react';

import { Badge, Checkbox, ListRow, Text, useConcealed } from '@/components/ds';
import { BankLogo } from '@/components/organisms';
import { formatAmount, formatDayMonth } from '@/features/accounts/list/accountsList';
import { bankById } from '@/features/banks/banks';
import type { RuleMatchTransaction } from '@/lib/rules.types';

import { matchPlastic, ruleLinkLabel } from './rulesModel';

export interface MatchRowProps {
  txn: RuleMatchTransaction;
  /** The rule being edited or applied; omitted while adding one. */
  ruleId?: string | null;
  /** With `onCheckedChange` the row carries a checkbox and a press ticks it; without, it only reads. */
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

/** One transaction a rule's pattern matches: description, date · account · categories, and the amount. */
export function MatchRow({ txn, ruleId, checked = false, onCheckedChange }: MatchRowProps) {
  const credit = txn.type === 'CREDIT';
  const concealed = useConcealed();
  const amount = formatAmount(Math.abs(Number(txn.amount)), 2);
  const plastic = matchPlastic(txn);
  const names = txn.categories.map((c) => c.name);
  const selectable = onCheckedChange !== undefined;
  return (
    <ListRow
      wrap
      role={selectable ? 'checkbox' : undefined}
      aria-checked={selectable ? checked : undefined}
      aria-label={selectable ? txn.sourcedDescription : undefined}
      onClick={selectable ? () => onCheckedChange(!checked) : undefined}
      leading={selectable ? <Checkbox checked={checked} tabIndex={-1} aria-hidden="true" /> : undefined}
      title={txn.sourcedDescription}
      subtitle={
        <span className="flex flex-wrap items-center gap-x-space-6 gap-y-space-4">
          <span>{formatDayMonth(txn.date)}</span>
          {txn.accountName ? (
            <span className="inline-flex items-center gap-space-4">
              {bankById(txn.accountBank ?? undefined) ? <BankLogo bankId={txn.accountBank ?? null} name={txn.accountName} size="sm" /> : null}
              {txn.accountName}
              {plastic ? ` ${plastic}` : ''}
            </span>
          ) : null}
          {names.length === 0 ? (
            <Badge variant="outline" shape="rounded">
              Uncategorized
            </Badge>
          ) : (
            names.map((name) => (
              <Badge key={name} variant="outline" shape="rounded">
                {name}
              </Badge>
            ))
          )}
          <span>({ruleLinkLabel(txn, ruleId)})</span>
        </span>
      }
      trailing={
        <Text variant="body-strong" tone={credit && !concealed ? 'positive' : 'ink'} className="tabular-nums" fraction="small">
          {credit ? `+${amount}` : amount}
        </Text>
      }
    />
  );
}
