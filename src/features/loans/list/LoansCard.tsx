'use client';

import Link from 'next/link';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { DataTable } from '@/components/ds/DataTable/DataTable';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import { closedBand, ClosedFooter, mutedWhenClosed } from '@/features/accounts/list/AccountsSections';
import { appHref } from '@/features/shell/routes';
import { watchSession } from '@/lib/authExpiry';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';
import { useAppRouter } from '@/lib/useAppRouter';
import { RowTransition } from '@/lib/viewTransition';

import { loadLoanFormDialog } from '../lazyDialogs';
import { loadClosedLoans } from './closedLoanActions';
import { loanColumns } from './LoansListCard';
import type { LoanRow } from './loansListModel';

const LOANS_HREF = appHref('/loans');

/** The Loans card on Accounts: one row per open loan (the same rows as the Loans page), "All loans" to the full page. */
export function LoansCard({ rows, closedLine }: { rows: LoanRow[]; closedLine: string | null }) {
  const router = useAppRouter();
  const [adding, setAdding] = React.useState(false);
  const { Component: LoanFormDialog, run: runLoan } = useLazyDialog(loadLoanFormDialog);
  const [closed, setClosed] = React.useState<LoanRow[] | null>(null);
  const [showing, setShowing] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);

  const toggle = () => {
    if (showing) return setShowing(false);
    if (closed) return setShowing(true);
    if (fetching) return;
    setFetching(true);
    void watchSession(loadClosedLoans('')).then((result) => {
      setFetching(false);
      if (!result.success) return showToast(result.error.message, { tone: 'danger' });
      setClosed(result.data);
      setShowing(true);
    });
  };

  return (
    <Card
      title="Loans"
      subtitle="Outstanding, EMI and next due"
      action={
        <Text variant="label" as="span">
          <Button variant="link" size="sm" asChild>
            <Link href={LOANS_HREF}>All loans</Link>
          </Button>
        </Text>
      }
    >
      <DataTable
        columns={loanColumns}
        data={showing && closed ? [...rows, ...closed] : rows}
        getRowId={(row) => row.id}
        wrapRow={(row, node) => <RowTransition key={row.id}>{node}</RowTransition>}
        rowState={mutedWhenClosed}
        band={closedBand<LoanRow>(closedLine, toggle)}
        phoneSub={(row) => row.phoneSub}
        onRowSelect={(row) => router.push(row.href)}
        empty={
          <EmptyState
            compact
            description="No loans"
            action={{ label: 'Add loan', onSelect: () => void runLoan(() => setAdding(true)) }}
          />
        }
        stickyHeader={false}
      />
      <ClosedFooter line={closedLine} showing={showing} onToggle={toggle} loading={fetching} />
      {adding && LoanFormDialog ? <LoanFormDialog onClose={() => setAdding(false)} /> : null}
    </Card>
  );
}

/** The card while it loads. */
export function LoansCardSkeleton() {
  return (
    <Card title="Loans" subtitle="Outstanding, EMI and next due">
      <DataTable columns={loanColumns} data={[]} getRowId={(row) => row.id} loading skeletonRows={2} />
    </Card>
  );
}
