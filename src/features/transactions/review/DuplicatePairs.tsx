'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Text } from '@/components/ds/Text/Text';
import { unwrapAction } from '@/lib/actionResult';
import type { DuplicateReviewTransaction } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

import { loadDuplicateReview } from '../transactionActions';
import { duplicatesHeading, duplicateSideDetail, duplicateSideLine, NO_TWIN_TEXT, pairsForSelection } from './duplicatesModel';

const SERVER_PAGE = 50;
const SHOWN_STEP = 10;

function Side({ label, t }: { label: string; t: DuplicateReviewTransaction }) {
  return (
    <div className="flex flex-col min-w-0">
      <Text variant="caption" tone="ink-3">
        {label}
      </Text>
      <Text variant="body-strong">{duplicateSideLine(t).description}</Text>
      <Text variant="caption" tone="ink-3">
        {duplicateSideDetail(t)}
      </Text>
    </div>
  );
}

/**
 * Evidence for approving "Duplicate": each transaction being approved next to the one it looks like, loaded page by page
 * from the server (the endpoint lists every flagged one, so pages are read until all of the approved ones are found).
 */
export function DuplicatePairs({ ids }: { ids: readonly string[] }) {
  const idSet = useMemo(() => new Set(ids), [ids]);
  const [shown, setShown] = useState(SHOWN_STEP);
  const { data, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: keys.transactions.reviewDuplicates({ size: SERVER_PAGE }),
    queryFn: ({ pageParam }) => unwrapAction(loadDuplicateReview(pageParam, SERVER_PAGE)),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.number + 1),
  });
  const pairs = useMemo(() => pairsForSelection((data?.pages ?? []).flatMap((p) => p.content), idSet), [data, idSet]);
  const found = pairs.length >= idSet.size;

  useEffect(() => {
    if (!found && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [found, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isError) {
    return (
      <Text variant="body" tone="ink-3">
        Couldn&apos;t load the possible duplicates.
      </Text>
    );
  }
  if (isPending) return <Text variant="body" tone="ink-3">Loading…</Text>;
  if (pairs.length === 0 && !hasNextPage) return null;

  return (
    <Card data-testid="duplicate-pairs">
      <Card.Section>{duplicatesHeading(pairs.length)}</Card.Section>
      {pairs.slice(0, shown).map((pair) => (
        <Card.Row key={pair.transaction.id} className="flex-col items-stretch gap-space-8">
          <Side label="This transaction" t={pair.transaction} />
          {pair.twin ? (
            <Side label="Looks like" t={pair.twin} />
          ) : (
            <Text variant="body" tone="ink-3">
              {NO_TWIN_TEXT}
            </Text>
          )}
        </Card.Row>
      ))}
      {pairs.length > shown ? (
        <Card.Row className="justify-center">
          <Text variant="label" as="span">
            <Button variant="link" size="sm" onClick={() => setShown((n) => n + SHOWN_STEP)}>
              Show more
            </Button>
          </Text>
        </Card.Row>
      ) : null}
    </Card>
  );
}
