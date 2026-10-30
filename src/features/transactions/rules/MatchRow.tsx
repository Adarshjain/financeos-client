'use client';

import React from 'react';

import { Checkbox } from '@/components/ds/Checkbox/Checkbox';
import { BankLogo } from '@/components/organisms/BankLogo/BankLogo';
import { TransactionRow } from '@/components/organisms/TransactionRow/TransactionRow';
import { bankById } from '@/features/banks/banks';
import { formatDate, formatMoney } from '@/lib/format';
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

/** One transaction a rule's pattern matches, drawn as a compact TransactionRow: description, date · account · categories, the amount. */
export function MatchRow({ txn, ruleId, checked = false, onCheckedChange }: MatchRowProps) {
  const credit = txn.type === 'CREDIT';
  const amount = formatMoney(Math.abs(Number(txn.amount)), { decimals: 'exact', symbol: false });
  const names = txn.categories.map((c) => c.name);
  const selectable = onCheckedChange !== undefined;
  return (
    <TransactionRow
      compact
      role={selectable ? 'checkbox' : undefined}
      aria-checked={selectable ? checked : undefined}
      aria-label={selectable ? txn.sourcedDescription : undefined}
      tabIndex={selectable ? 0 : undefined}
      onClick={selectable ? () => onCheckedChange(!checked) : undefined}
      onKeyDown={
        selectable
          ? (e: React.KeyboardEvent) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              onCheckedChange(!checked);
            }
          : undefined
      }
      leading={selectable ? <Checkbox checked={checked} tabIndex={-1} aria-hidden="true" /> : undefined}
      description={txn.sourcedDescription}
      date={formatDate(txn.date, 'list')}
      account={txn.accountName || undefined}
      accountLogo={
        txn.accountName && bankById(txn.accountBank ?? undefined) ? (
          <BankLogo bankId={txn.accountBank ?? null} name={txn.accountName} size="sm" />
        ) : undefined
      }
      plastic={matchPlastic(txn) ?? undefined}
      categories={names}
      unsetCategoryLabel="Uncategorized"
      provenance={`(${ruleLinkLabel(txn, ruleId)})`}
      amount={credit ? `+${amount}` : amount}
      isCredit={credit}
      selected={selectable ? checked : undefined}
    />
  );
}
