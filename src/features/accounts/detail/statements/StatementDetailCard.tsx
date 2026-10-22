'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import {
  Banner,
  Button,
  Card,
  CardFooter,
  createDataTableColumnHelper,
  DataTable,
  EmptyState,
  Icon,
  Menu,
  MenuItem,
  StatusWord,
  StatusWords,
  Text,
} from '@/components/ds';

import { DeleteStatementDialog } from './DeleteStatementDialog';
import type { LineRowModel, StatementDetailModel } from './detailModel';
import { EditDetailsDialog } from './EditDetailsDialog';

const helper = createDataTableColumnHelper<LineRowModel>();

const allColumns = helper.columns([
  helper.accessor('index', {
    id: 'index',
    header: '#',
    meta: { size: 'xs', align: 'end', phone: 'hidden' },
  }),
  helper.accessor('date', {
    id: 'date',
    header: 'Date',
    meta: { size: 'sm', phone: 'hidden' },
  }),
  helper.accessor('description', {
    id: 'description',
    header: 'Line',
    meta: { size: 'fill', phone: 'main' },
  }),
  helper.display({
    id: 'matched',
    header: 'Status',
    meta: { size: 'lg', phone: 'status' },
    cell: ({ row }) => {
      const { linked, review, chain } = row.original;
      return (
        <StatusWords
          items={[
            linked ? { tone: 'info', label: 'Linked' } : { tone: 'neutral', label: 'New' },
            // One word on the line: a broken chain is the exception, else the review word.
            ...(chain === 'broken'
              ? [{ tone: 'warning' as const, label: 'Chain broken' }]
              : review
                ? [{ tone: review.tone, label: review.label }]
                : []),
          ]}
        />
      );
    },
  }),
  helper.accessor('balanceAfter', {
    id: 'balanceAfter',
    header: 'Balance after',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
  }),
  helper.display({
    id: 'amount',
    header: 'Amount',
    meta: { size: 'sm', align: 'end', phone: 'amount' },
    cell: ({ row }) =>
      row.original.credit ? (
        <Text tone="positive" as="span">
          {row.original.amount}
        </Text>
      ) : (
        row.original.amount
      ),
  }),
]);

const columnsFor = (hasBalance: boolean) =>
  hasBalance ? allColumns : allColumns.filter((c) => (c as { id?: string }).id !== 'balanceAfter');

export interface StatementDetailCardProps {
  accountId: string;
  fy: string;
  model: StatementDetailModel;
}

/** The right pane: the selected statement with its totals, its lines and its actions. */
export function StatementDetailCard({ accountId, fy, model }: StatementDetailCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  return (
    <Card
      title={model.title}
      subtitle={
        <>
          {model.subtitle.join(' · ')}
          {model.checksumOk != null ? (
            <>
              {' · '}
              <StatusWord tone={model.checksumOk ? 'success' : 'warning'}>
                {model.checksumOk ? 'Checksum OK' : 'Checksum failed'}
              </StatusWord>
            </>
          ) : null}
        </>
      }
      action={
        <Menu
          align="end"
          trigger={
            <Button variant="secondary" size="sm" iconOnly aria-label="More actions">
              <Icon name="more" size="sm" />
            </Button>
          }
        >
          {model.isCard ? <MenuItem onSelect={() => setEditOpen(true)}>Edit details</MenuItem> : null}
          <MenuItem destructive onSelect={() => setDeleteOpen(true)}>
            Delete statement
          </MenuItem>
        </Menu>
      }
    >
      <div className="px-space-16 pt-space-4 pb-space-12 grid grid-cols-2 desk:grid-cols-3 gap-space-8">
        {model.stats.map((stat) => (
          <div key={stat.label} className="min-w-0 flex flex-col gap-space-2">
            <Text variant="label" tone="ink-3" as="div">
              {stat.label}
            </Text>
            <Text variant="figure" as="div" fraction="small">
              {stat.value}
            </Text>
          </div>
        ))}
      </div>
      <div className="px-space-16 pb-space-12 grid grid-cols-2 desk:grid-cols-3 gap-space-8">
        {model.details.map((stat) => (
          <div key={stat.label} className="min-w-0 flex flex-col gap-space-2">
            <Text variant="label" tone="ink-3" as="div">
              {stat.label}
            </Text>
            <Text variant="body-strong" as="div">
              {stat.value}
            </Text>
          </div>
        ))}
      </div>
      {model.missingBanner ? (
        <div className="px-space-16 pb-space-10">
          <Banner tone="warning" action={{ label: 'Fill in', onSelect: () => setEditOpen(true) }}>
            {model.missingBanner}{' '}
            <Button variant="link" size="sm" onClick={() => router.push(`/transactions/import?account=${accountId}`)}>
              Re-upload to retry
            </Button>
          </Banner>
        </div>
      ) : null}
      {model.skippedBanner ? (
        <div className="px-space-16 pb-space-10">
          <Banner tone="info">{model.skippedBanner}</Banner>
        </div>
      ) : null}
      <DataTable
        columns={columnsFor(model.lines.some((l) => l.balanceAfter !== '—'))}
        data={model.lines}
        getRowId={(line) => line.id}
        sortMode="client"
        phoneSub={(line) => line.phoneSub}
        empty={<EmptyState compact title="No transaction rows linked to this statement." />}
      />
      {model.ledgerLine ? (
        <CardFooter>
          <Text variant="body" tone="ink-3" as="span">
            {model.ledgerLine}
          </Text>
        </CardFooter>
      ) : null}
      {model.isCard ? (
        <EditDetailsDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          statementId={model.statementId}
          statementLabel={model.title}
          initial={{
            periodStart: model.periodStart,
            periodEnd: model.periodEnd,
            dueDate: model.dueDate,
            totalDue: model.totalDue,
            minimumDue: model.minimumDue,
          }}
        />
      ) : null}
      <DeleteStatementDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        accountId={accountId}
        statementId={model.statementId}
        periodEndLabel={model.periodEndLabel}
        source={model.source}
        fy={fy}
      />
    </Card>
  );
}
