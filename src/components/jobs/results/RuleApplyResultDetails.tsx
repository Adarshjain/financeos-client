import Link from 'next/link';
import React from 'react';

import { MATCH_TYPE_META } from '@/lib/rules.matchTypes';
import type { MatchType } from '@/lib/rules.types';
import type { RuleApplyResult } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

import { RESULT_CARD, ResultSection } from './ResultSection';

/** RULE_APPLY result: which rule, what it sets, how many it touched, why the rest were left alone. */
export function RuleApplyResultDetails({ result }: { result: RuleApplyResult }) {
  const applied = result.appliedCount ?? 0;
  const transactions = result.transactions ?? [];
  const more = applied - transactions.length;
  const matchChip = result.matchType ? MATCH_TYPE_META[result.matchType as MatchType]?.chip ?? result.matchType : null;
  const left = [
    result.skippedManuallyReviewed ? `${result.skippedManuallyReviewed} reviewed by you (left unchanged)` : null,
    result.skippedNoLongerMatching ? `${result.skippedNoLongerMatching} don't match the pattern` : null,
    result.notFound ? `${result.notFound} no longer exist` : null,
  ].filter(Boolean);

  return (
    <div className={RESULT_CARD}>
      <div className="font-semibold text-slate-800 dark:text-slate-200">
        Applied to {applied}
        {result.requested !== undefined && ` of ${result.requested}`} transaction{applied === 1 ? '' : 's'}
        {result.allMatches !== undefined && (result.allMatches ? ' (all matching)' : ' (picked by you)')}
      </div>

      {result.ruleName && (
        <div className="text-slate-600 dark:text-slate-400 break-words">
          Rule{' '}
          <Link href="/rules" className="underline font-medium text-slate-800 dark:text-slate-200">
            {result.ruleName}
          </Link>
          {matchChip && result.pattern && ` · ${matchChip} "${result.pattern}"`}
          {result.categories && result.categories.length > 0 && ` → ${result.categories.join(', ')}`}
        </div>
      )}

      {left.length > 0 && <div className="text-slate-600 dark:text-slate-400">Not applied: {left.join(' · ')}</div>}

      <ResultSection title="Transactions updated" count={transactions.length}>
        {transactions.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-2">
            <span className="truncate">
              <span className="tabular-nums text-slate-500">{formatDate(t.date)}</span> {t.description || '—'}
            </span>
            <span className="tabular-nums shrink-0">
              {t.type === 'CREDIT' ? '+' : ''}
              {formatCurrency(t.amount)}
            </span>
          </li>
        ))}
        {more > 0 && <li className="text-slate-500 italic">…and {more} more</li>}
      </ResultSection>
    </div>
  );
}
