'use client';

import Link from 'next/link';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { FilterChip } from '@/components/ds/FilterChip/FilterChip';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Select } from '@/components/ds/Select/Select';
import { StatusWord } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import { appHref } from '@/features/shell/routes';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { useBillMutations } from '@/lib/query/hooks/useBills';
import { useAppRouter } from '@/lib/useAppRouter';

import { accountHref } from '../accountTabsModel';
import { fyLabel, type StatementsListRow } from './listModel';
import { useStatementSkip } from './useStatementSkip';

export interface StatementsListCardProps {
  accountId: string;
  isCard: boolean;
  fy: string;
  fyOptions: string[];
  rows: StatementsListRow[];
}

/** The left pane: the year's statements, each one a bill. */
export function StatementsListCard({ accountId, isCard, fy, fyOptions, rows }: StatementsListCardProps) {
  const router = useAppRouter();
  const [navPending, startNav] = React.useTransition();
  const [undoingId, setUndoingId] = React.useState<string | null>(null);
  const { unmarkPaid } = useBillMutations();
  const statementSkip = useStatementSkip();
  const base = `${accountHref(accountId)}/statements`;

  const undo = async (statementId: string) => {
    if (undoingId) return;
    setUndoingId(statementId);
    try {
      await unmarkPaid.mutateAsync(statementId);
      showToast('Payment mark removed');
      startNav(() => router.refresh());
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't undo the payment. Try again."), { tone: 'danger' });
    } finally {
      setUndoingId(null);
    }
  };

  return (
    <Card
      title="Statements"
      subtitle={isCard ? 'Each statement is a bill' : undefined}
      action={
        <Select
          value={fy}
          options={fyOptions.map((value) => ({ value, label: fyLabel(value) }))}
          loading={navPending}
          onValueChange={(value) => startNav(() => router.replace(`${base}?fy=${value as string}`, { scroll: false }))}
          trigger={<FilterChip hasDropdown>{fyLabel(fy)}</FilterChip>}
        />
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          compact
          title={`No statements in ${fyLabel(fy)}`}
          action={{
            label: 'Upload statement',
            variant: 'link',
            href: `/transactions/import?account=${accountId}`,
          }}
        />
      ) : (
        rows.map((entry) => {
          if (entry.kind !== 'statement') {
            const missing = entry.kind === 'missing';
            return (
              <ListRow
                key={missing ? `missing-${entry.periodEnd}` : `skip-${entry.id}`}
                data-testid={missing ? 'statement-missing-row' : 'statement-skipped-row'}
                title={
                  <Text tone={missing ? 'danger' : 'ink-3'} as="span">
                    {entry.title}
                  </Text>
                }
                subtitle={entry.caption}
                actions={
                  missing
                    ? [
                        {
                          id: 'no-statement',
                          label: 'No statement this period',
                          onSelect: () => void statementSkip.skip(accountId, entry.periodEnd),
                        },
                      ]
                    : undefined
                }
                trailing={
                  missing ? (
                    <>
                      <Button variant="secondary" size="sm" asChild>
                        <Link href={appHref(`/transactions/import?account=${accountId}`)} prefetch={false}>
                          Upload
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="link"
                        size="sm"
                        loading={statementSkip.undoing === entry.id}
                        onClick={() => entry.id && void statementSkip.undo(accountId, entry.id)}
                      >
                        Undo
                      </Button>
                    </>
                  )
                }
              />
            );
          }
          const row = entry.row;
          return (
          <ListRow
            key={row.id}
            highlighted={row.selected}
            title={row.title}
            subtitle={
              <>
                {row.caption}
                {row.undo ? (
                  <>
                    {' '}
                    <Button
                      variant="link"
                      size="sm"
                      loading={undoingId === row.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        void undo(row.id);
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      Undo
                    </Button>
                  </>
                ) : null}
              </>
            }
            trailing={
              <>
                {row.verdict ? <StatusWord tone={row.verdict.tone}>{row.verdict.label}</StatusWord> : null}
                {row.badge ? <StatusWord tone={row.badge.tone}>{row.badge.label}</StatusWord> : null}
              </>
            }
            onClick={() => startNav(() => router.replace(`${base}?statement=${row.id}&fy=${fy}`, { scroll: false }))}
          />
          );
        })
      )}
    </Card>
  );
}
