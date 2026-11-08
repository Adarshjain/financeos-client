'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { FilterChip } from '@/components/ds/FilterChip/FilterChip';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Pager } from '@/components/ds/Pager/Pager';
import { Select } from '@/components/ds/Select/Select';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { Text } from '@/components/ds/Text/Text';
import { unwrapAction } from '@/lib/actionResult';
import type { Schemas } from '@/lib/api/types';

import { EmailDetailsDialog } from './FailureDetailsDialog';
import { loadFailedEmails, retryEmail, skipEmail } from './failuresActions';
import {
  EMAIL_FILTER_OPTIONS,
  type EmailFilter,
  emailSecondary,
  emailTitle,
  type FailedEmail,
  failureKeys,
  FAILURES_PAGE_SIZE,
  firstLine,
  openFromRow,
} from './failuresModel';
import { ReasonDialog } from './ReasonDialog';
import { useFailureRunner } from './useFailureRunner';

type EmailPage = Schemas['PageFailedGmailItemResponse'];

/** The Emails tab: status filter, rows with a ⋯ menu, Details, Skip… and the Pager. */
export function EmailsTab({ initial, currentUserId }: { initial: EmailPage; currentUserId?: string }) {
  const [filter, setFilter] = React.useState<EmailFilter>('failed');
  const [page, setPage] = React.useState(0);
  const [details, setDetails] = React.useState<FailedEmail | null>(null);
  const [skipping, setSkipping] = React.useState<FailedEmail | null>(null);
  const run = useFailureRunner();

  // The server-rendered first page seeds the default filter only; it is not fetched again on load.
  const seeded = filter === 'failed' && page === 0;
  const { data, isPending, isError } = useQuery({
    queryKey: failureKeys.emails(filter, page),
    queryFn: () => unwrapAction(loadFailedEmails(filter, page)),
    initialData: seeded ? initial : undefined,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const items = data?.content ?? [];
  const retry = (item: FailedEmail) => run(retryEmail(item.ledgerId), 'Retrying that email');
  const canRetry = (item: FailedEmail) => item.status === 'FAILED_RETRYABLE' || item.status === 'FAILED_PERMANENT';

  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-12">
      <Select
        value={filter}
        options={EMAIL_FILTER_OPTIONS}
        onValueChange={(v) => {
          setFilter(v as EmailFilter);
          setPage(0);
        }}
        trigger={
          <FilterChip className="shrink-0 self-start" hasDropdown>
            {EMAIL_FILTER_OPTIONS.find((o) => o.value === filter)?.label}
          </FilterChip>
        }
      />
      <Card>
        {isPending ? (
          <div className="flex flex-col gap-space-8 p-space-16">
            <Skeleton height={16} />
            <Skeleton height={16} width="60%" />
          </div>
        ) : isError && items.length === 0 ? (
          <EmptyState compact title="Couldn't load the emails." />
        ) : items.length === 0 ? (
          <EmptyState compact title={filter === 'failed' ? 'No failed emails.' : 'No skipped emails.'} />
        ) : (
          items.map((item) => (
            <ListRow
              key={item.ledgerId}
              title={emailTitle(item)}
              subtitle={emailSecondary(item)}
              onClick={(e) => openFromRow(e, () => setDetails(item))}
              actions={[
                ...(canRetry(item) ? [{ id: 'retry', label: 'Retry now', onSelect: () => void retry(item) }] : []),
                ...(canRetry(item) ? [{ id: 'skip', label: 'Skip…', onSelect: () => setSkipping(item) }] : []),
                { id: 'details', label: 'Details', onSelect: () => setDetails(item) },
              ]}
            >
              {firstLine(item.error) ? (
                <Text variant="label" tone="ink-4" truncate className="block mt-space-2">
                  {firstLine(item.error)}
                </Text>
              ) : null}
            </ListRow>
          ))
        )}
        <Pager
          page={page}
          size={FAILURES_PAGE_SIZE}
          totalElements={data?.totalElements ?? 0}
          totalPages={data?.totalPages ?? 0}
          unit="emails"
          sizeOptions={[FAILURES_PAGE_SIZE]}
          onPageChange={setPage}
        />
      </Card>

      {details ? (
        <EmailDetailsDialog
          item={details}
          currentUserId={currentUserId}
          onClose={() => setDetails(null)}
          retry={
            canRetry(details)
              ? {
                  label: 'Retry now',
                  onSelect: () => {
                    const d = details;
                    setDetails(null);
                    void retry(d);
                  },
                }
              : undefined
          }
          second={
            canRetry(details)
              ? {
                  label: 'Skip…',
                  onSelect: () => {
                    setSkipping(details);
                    setDetails(null);
                  },
                }
              : undefined
          }
        />
      ) : null}
      {skipping ? (
        <ReasonDialog
          title="Skip this email?"
          description="It leaves the failed list and won't be retried."
          confirmLabel="Skip"
          onClose={() => setSkipping(null)}
          onConfirm={async (reason) => {
            const ok = await run(skipEmail(skipping.ledgerId, reason), 'Email skipped');
            if (ok) setSkipping(null);
          }}
        />
      ) : null}
    </div>
  );
}
