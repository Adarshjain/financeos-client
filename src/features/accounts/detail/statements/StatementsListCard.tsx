'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { FilterChip } from '@/components/ds/FilterChip/FilterChip';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Select } from '@/components/ds/Select/Select';
import { StatusWord } from '@/components/ds/StatusWords/StatusWords';
import { showToast } from '@/components/ds/Toast/Toast';
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
      showToast(getErrorMessage(e, "Couldn't undo the payment. Try again."), { tone: 'danger' });
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
            href: `/transactions/import?account=${accountId}`,
          }}
        />
      ) : (
        rows.map((row) => (
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
            onClick={() => router.push(`${base}?statement=${row.id}&fy=${fy}`)}
          />
        ))
      )}
    </Card>
  );
}
