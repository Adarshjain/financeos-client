'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { Icon } from '@/components/ds/Icon/Icon';
import { Pager } from '@/components/ds/Pager/Pager';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { Text } from '@/components/ds/Text/Text';
import { ErrorState } from '@/components/organisms/ErrorState/ErrorState';
import { formatCount } from '@/lib/format';
import type { MatchType } from '@/lib/rules.types';
import { validatePattern } from '@/lib/rules.validate';
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from '@/lib/useDebouncedValue';

import { MatchRow } from './MatchRow';
import { useRuleMatches } from './useRuleMatches';

export const PREVIEW_PAGE_SIZE = 5;

export interface RuleMatchesPreviewProps {
  matchType: MatchType;
  /** The pattern as typed. */
  pattern: string;
  /** Set when editing, to tell the rows already on this rule from the others. */
  ruleId?: string;
}

/**
 * How many transactions the form's pattern matches right now, and how many of those were set by hand (they stay as they are).
 * It loads when the form opens and follows the pattern as it is typed (after a pause); See them lists the matches, read-only,
 * and Refresh matches asks again.
 */
export function RuleMatchesPreview({
  matchType,
  pattern,
  ruleId,
}: RuleMatchesPreviewProps) {
  const settled = useDebouncedValue(pattern.trim(), SEARCH_DEBOUNCE_MS);
  const usable = settled !== '' && validatePattern(matchType, settled) === null;
  const [showing, setShowing] = React.useState(false);
  const {
    page,
    setPage,
    matches,
    matchCount,
    userSetCount,
    loading,
    failed,
    fetching,
    refetch,
  } = useRuleMatches({
    merchantKey: settled,
    matchType,
    size: PREVIEW_PAGE_SIZE,
    enabled: usable,
  });

  if (!usable) return null;

  const total = matches?.totalElements ?? 0;
  const summary = `Matches ${formatCount(matchCount, ['past transaction', 'past transactions'])}${
    userSetCount > 0
      ? ` · ${userSetCount} that ${userSetCount === 1 ? 'was' : 'were'} set by hand stay as they are`
      : ''
  }`;
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-space-4">
        <Text variant="body" tone="ink-2" as="span">
          {failed
            ? "Couldn't load the matches"
            : loading || !matches
              ? 'Finding matches…'
              : summary}
        </Text>
        {matches && matchCount > 0 ? (
          <>
            <Text variant="body" tone="ink-3" as="span">
              ·
            </Text>
            <Button
              type="button"
              variant="link"
              onClick={() => setShowing((now) => !now)}
            >
              {showing ? 'Hide them' : 'See them'}
            </Button>
          </>
        ) : null}
      </div>
      {showing || failed ? (
        <Card
          title={
            failed
              ? 'Matches'
              : loading || !matches
                ? 'Finding matches…'
                : `Matches now · ${total}`
          }
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
          <Text
            variant="caption"
            tone="ink-3"
            as="p"
            className="px-space-16 py-space-8"
          >
            Manually reviewed transactions are left out.
          </Text>
        </Card>
      ) : null}
    </>
  );
}
