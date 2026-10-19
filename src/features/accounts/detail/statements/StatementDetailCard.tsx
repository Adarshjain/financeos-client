'use client';

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
  Text,
} from '@/components/ds';

import { DeleteStatementDialog } from './DeleteStatementDialog';
import type { LineRowModel, StatementDetailModel } from './detailModel';
import { SetDueDateDialog } from './SetDueDateDialog';

const helper = createDataTableColumnHelper<LineRowModel>();

const columns = helper.columns([
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
    header: 'Matched',
    meta: { size: 'sm', phone: 'status' },
    cell: ({ row }) =>
      row.original.linked ? (
        <StatusWord tone="info">Linked</StatusWord>
      ) : (
        <StatusWord tone="neutral">New</StatusWord>
      ),
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

export interface StatementDetailCardProps {
  accountId: string;
  fy: string;
  model: StatementDetailModel;
}

/** The right pane: the selected statement with its totals, its lines and its actions. */
export function StatementDetailCard({ accountId, fy, model }: StatementDetailCardProps) {
  const [dueOpen, setDueOpen] = React.useState(false);
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
          {model.isCard ? <MenuItem onSelect={() => setDueOpen(true)}>Set due date</MenuItem> : null}
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
            <Text variant="figure" as="div">
              {stat.value}
            </Text>
          </div>
        ))}
      </div>
      {model.skippedBanner ? (
        <div className="px-space-16 pb-space-10">
          <Banner tone="info">{model.skippedBanner}</Banner>
        </div>
      ) : null}
      <DataTable
        columns={columns}
        data={model.lines}
        getRowId={(line) => line.id}
        sortMode="client"
        phoneSub={(line) => line.phoneSub}
        empty={<EmptyState compact title="No transaction rows linked to this statement." />}
      />
      <CardFooter>
        {model.ledgerLine ? (
          <Text variant="body" tone="ink-3" as="span">
            {model.ledgerLine}
          </Text>
        ) : null}
        <div className="flex items-center gap-space-8 ml-auto">
          {model.isCard ? (
            <Button variant="secondary" size="sm" onClick={() => setDueOpen(true)}>
              Set due date
            </Button>
          ) : null}
          <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
            Delete statement
          </Button>
        </div>
      </CardFooter>
      {model.isCard ? (
        <SetDueDateDialog
          open={dueOpen}
          onOpenChange={setDueOpen}
          statementId={model.statementId}
          statementLabel={model.title}
          dueDate={model.dueDate}
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
