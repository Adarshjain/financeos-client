'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ListChecks } from 'lucide-react';
import { useState } from 'react';

import { TablePagination } from '@/components/reports/views/TablePagination';
import { RuleLinkLabel } from '@/components/rules/RuleLinkLabel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { MatchType, PagedRuleMatches } from '@/lib/rules.types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

import { validatePattern } from './RuleFormDialog';

const PAGE_SIZE = 10;

interface RulePatternPreviewProps {
  matchType: MatchType;
  merchantKey: string;
  /** Set when editing, to mark transactions already linked to this rule. */
  editingRuleId?: string;
}

/**
 * Read-only preview of the transactions the form's current (possibly unsaved)
 * pattern would match. Runs on demand and keeps showing the last searched
 * pattern until refreshed, so typing doesn't fire a request per keystroke.
 * Applying stays on the rule card's Find Matches, which uses the saved pattern.
 */
export function RulePatternPreview({ matchType, merchantKey, editingRuleId }: RulePatternPreviewProps) {
  const [target, setTarget] = useState<{ merchantKey: string; matchType: MatchType } | null>(null);
  const [page, setPage] = useState(0);

  const pattern = merchantKey.trim();
  const patternError = pattern ? validatePattern(matchType, pattern) : 'Enter a pattern first.';
  const stale = target !== null && (target.merchantKey !== pattern || target.matchType !== matchType);

  const matchesQuery = useQuery({
    queryKey: keys.rules.preview({ ...target, page, size: PAGE_SIZE }),
    queryFn: async () => {
      const { data } = await api.POST('/api/v1/rules/preview-matches', {
        params: { query: { page, size: PAGE_SIZE, sort: [] } },
        body: target!,
      });
      return data as PagedRuleMatches;
    },
    enabled: target !== null,
    placeholderData: keepPreviousData,
  });

  const matches = matchesQuery.data ?? null;
  const rows = matches?.content ?? [];

  const runPreview = () => {
    setTarget({ merchantKey: pattern, matchType });
    setPage(0);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={runPreview}
          disabled={patternError !== null}
        >
          <ListChecks className="h-3.5 w-3.5" />
          {target && stale ? 'Refresh matches' : 'Find matching transactions'}
        </Button>
        {target && stale && (
          <span className="text-2xs text-amber-600 dark:text-amber-400">
            Pattern changed since this search
          </span>
        )}
      </div>

      {target && (
        <div className="rounded-xl border border-slate-200/60 dark:border-slate-800/60">
          <div className="px-3 py-2 text-2xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/60">
            {matchesQuery.isLoading
              ? 'Finding matches…'
              : `${matches?.totalElements ?? 0} matching transaction${
                  matches?.totalElements === 1 ? '' : 's'
                } · manually reviewed ones excluded`}
          </div>

          {!matchesQuery.isLoading && rows.length === 0 && (
            <div className="py-6 text-center text-xs text-slate-400">
              No transactions match this pattern.
            </div>
          )}

          {rows.length > 0 && (
            <ul className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              {rows.map((txn) => (
                <li key={txn.id} className="px-3 py-2 space-y-1">
                  <div className="flex justify-between gap-2 text-xs">
                    <span className="text-slate-700 dark:text-slate-300 break-all">
                      {txn.sourcedDescription}
                      <RuleLinkLabel txn={txn} ruleId={editingRuleId} />
                    </span>
                    <span
                      className={cn(
                        'tabular-nums whitespace-nowrap font-medium',
                        txn.type === 'CREDIT'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-700 dark:text-slate-300'
                      )}
                    >
                      {txn.type === 'DEBIT' ? '-' : ''}
                      {formatCurrency(txn.amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap text-2xs text-slate-400">
                    <span className="tabular-nums">{formatDate(txn.date)}</span>
                    {txn.categories.length === 0 ? (
                      <span className="italic">Uncategorized</span>
                    ) : (
                      txn.categories.map((c) => (
                        <Badge
                          key={c.id}
                          variant="outline"
                          className="rounded-full px-2 py-0 text-2xs border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                        >
                          {c.name}
                        </Badge>
                      ))
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {matches && matches.totalPages > 1 && (
            <TablePagination
              page={{
                number: matches.number,
                size: matches.size,
                totalElements: matches.totalElements,
                totalPages: matches.totalPages,
              }}
              loading={matchesQuery.isFetching}
              onPageChange={setPage}
              unit="transaction"
              className="w-full px-3 py-1 border-t border-slate-100 dark:border-slate-800/60"
            />
          )}
        </div>
      )}
    </div>
  );
}
