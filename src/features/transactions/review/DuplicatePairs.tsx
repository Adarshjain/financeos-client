'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Text } from '@/components/ds/Text/Text';
import { unwrapAction } from '@/lib/actionResult';
import type { DuplicateReviewTransaction } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

import { loadDuplicateReview } from '../transactionActions';
import { duplicatesHeading, duplicateSideDetail, duplicateSideLine, NO_TWIN_TEXT } from './duplicatesModel';

const PAGE_SIZE = 10;

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
 * Evidence for approving "Duplicate": each transaction being approved next to the one it looks like. The server returns
 * only the approved ones, ten per page, and "Show more" reads the next page.
 */
export function DuplicatePairs({ ids }: { ids: readonly string[] }) {
  const { data, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: keys.transactions.reviewDuplicates({ ids, size: PAGE_SIZE }),
    queryFn: ({ pageParam }) => unwrapAction(loadDuplicateReview([...ids], pageParam, PAGE_SIZE)),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.number + 1),
  });
  const pairs = (data?.pages ?? []).flatMap((p) => p.content);
  const total = data?.pages[0]?.totalElements ?? pairs.length;

  if (isError) {
    return (
      <Text variant="body" tone="ink-3">
        Couldn&apos;t load the possible duplicates.
      </Text>
    );
  }
  if (isPending) return <Text variant="body" tone="ink-3">Loading…</Text>;
  if (pairs.length === 0) return null;

  return (
    <Card data-testid="duplicate-pairs">
      <Card.Section>{duplicatesHeading(total)}</Card.Section>
      {pairs.map((pair) => (
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
      {hasNextPage ? (
        <Card.Row className="justify-center">
          <Text variant="label" as="span">
            <Button variant="link" size="sm" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
              Show more
            </Button>
          </Text>
        </Card.Row>
      ) : null}
    </Card>
  );
}
