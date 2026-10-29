'use client';

import React from 'react';

import { Button, Card, EmptyState, Icon, Pager, Skeleton, Text } from '@/components/ds';
import { ErrorState } from '@/components/organisms';
import type { MatchType } from '@/lib/rules.types';
import { validatePattern } from '@/lib/rules.validate';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

import { MatchRow } from './MatchRow';
import { useRuleMatches } from './useRuleMatches';

export const PREVIEW_PAGE_SIZE = 10;
const PREVIEW_DEBOUNCE_MS = 400;

export interface RuleMatchesPreviewProps {
  matchType: MatchType;
  /** The pattern as typed. */
  pattern: string;
  /** Set when editing, to tell the rows already on this rule from the others. */
  ruleId?: string;
}

/**
 * The transactions the form's pattern matches right now, read-only. It loads when the form opens and follows the pattern
 * as it is typed (after a pause); Refresh matches asks again.
 */
export function RuleMatchesPreview({ matchType, pattern, ruleId }: RuleMatchesPreviewProps) {
  const settled = useDebouncedValue(pattern.trim(), PREVIEW_DEBOUNCE_MS);
  const usable = settled !== '' && validatePattern(matchType, settled) === null;
  const { page, setPage, matches, loading, failed, fetching, refetch } = useRuleMatches({
    merchantKey: settled,
    matchType,
    size: PREVIEW_PAGE_SIZE,
    enabled: usable,
  });

  if (!usable) return null;

  const total = matches?.totalElements ?? 0;
  return (
    <Card
      title={failed ? 'Matches' : loading || !matches ? 'Finding matches…' : `Matches now · ${total}`}
      action={
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={fetching}
          icon={<Icon name="arrow-clockwise" size="xs" />}
          onClick={refetch}
        >
          Refresh matches
        </Button>
      }
    >
      {failed ? (
        <ErrorState
          title="Couldn't load matches"
          description="The matches didn't load."
          action={{ label: 'Retry', onSelect: refetch }}
        />
      ) : loading || !matches ? (
        <Skeleton height={48} />
      ) : matches.content.length === 0 ? (
        <EmptyState compact title="No transactions match this pattern" />
      ) : (
        <>
          {matches.content.map((txn) => (
            <MatchRow key={txn.id} txn={txn} ruleId={ruleId} />
          ))}
          {matches.totalPages > 1 ? (
            <Pager
              variant="compact"
              page={page}
              size={PREVIEW_PAGE_SIZE}
              totalElements={total}
              totalPages={matches.totalPages}
              unit="matches"
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}
      <Text variant="caption" tone="ink-3" as="p" className="px-space-16 py-space-8">
        Manually reviewed transactions are left out.
      </Text>
    </Card>
  );
}
