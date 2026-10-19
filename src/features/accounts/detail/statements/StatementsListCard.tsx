'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  FilterChip,
  ListRow,
  Select,
  showToast,
  StatusWord,
} from '@/components/ds';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { useBillMutations } from '@/lib/query/hooks/useBills';

import { accountHref } from '../accountTabsModel';
import { fyLabel, type StatementRowModel } from './listModel';

export interface StatementsListCardProps {
  accountId: string;
  isCard: boolean;
  fy: string;
  fyOptions: string[];
  rows: StatementRowModel[];
}

/** The left pane: the year's statements, each one a bill. */
export function StatementsListCard({ accountId, isCard, fy, fyOptions, rows }: StatementsListCardProps) {
  const router = useRouter();
  const { unmarkPaid } = useBillMutations();
  const base = `${accountHref(accountId)}/statements`;

  const undo = async (statementId: string) => {
    try {
      await unmarkPaid.mutateAsync(statementId);
      showToast('Payment mark removed');
      router.refresh();
    } catch (e) {
      showToast(getErrorMessage(e, 'Could not undo the payment mark'), { tone: 'danger' });
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
          onValueChange={(value) => router.push(`${base}?fy=${value as string}`)}
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
            onSelect: () => router.push(`/transactions/import?account=${accountId}`),
          }}
        />
      ) : (
        rows.map((row) => (
          <ListRow
            key={row.id}
            highlighted={row.selected}
            chevron
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
                {row.badge ? <Badge tone={row.badge.tone}>{row.badge.label}</Badge> : null}
              </>
            }
            onClick={() => router.push(`${base}?statement=${row.id}&fy=${fy}`)}
          />
        ))
      )}
    </Card>
  );
}
