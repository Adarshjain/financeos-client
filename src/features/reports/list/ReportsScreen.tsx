'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  createDataTableColumnHelper,
  DataTable,
  EmptyState,
  FilterChip,
  Icon,
  Menu,
  MenuItem,
  Select,
  Text,
  TextField,
} from '@/components/ds';
import type { ReportType } from '@/lib/reports.types';

import { AddToDashboardDialog } from './AddToDashboardDialog';
import { ReportsAside } from './ReportsAside';
import {
  CHAT_HREF,
  datasourceOptions,
  filterRows,
  type ReportRow,
  reportsUrl,
  TYPE_CHIPS,
} from './reportsList';
import { useReportActions } from './useReportActions';

/** A press on a control inside a row must not also open the row. */
const stop = (e: React.SyntheticEvent) => e.stopPropagation();

const noop = () => undefined;

const ch = createDataTableColumnHelper<ReportRow>();

interface RowActions {
  onEdit: (row: ReportRow) => void;
  onDuplicate: (row: ReportRow) => void;
  onAddToDashboard: (row: ReportRow) => void;
  onDelete: (row: ReportRow) => void;
  duplicating: boolean;
}

/** The ⋯ menu of a report: on a desktop row it is the last cell, on a phone row it sits under the lines. */
function RowMenu({ row, actions }: { row: ReportRow; actions: RowActions }) {
  return (
    <Menu
      align="end"
      trigger={
        <Button variant="ghost" size="sm" iconOnly aria-label={`Options for ${row.name}`}>
          <Icon name="more" size="sm" />
        </Button>
      }
    >
      <MenuItem onSelect={() => actions.onEdit(row)}>Edit</MenuItem>
      <MenuItem disabled={actions.duplicating} onSelect={() => actions.onDuplicate(row)}>
        Duplicate
      </MenuItem>
      <MenuItem onSelect={() => actions.onAddToDashboard(row)}>Add to dashboard</MenuItem>
      <MenuItem destructive onSelect={() => actions.onDelete(row)}>
        Delete
      </MenuItem>
    </Menu>
  );
}

function makeColumns(actions: RowActions) {
  return [
    ch.display({
      id: 'report',
      header: 'Report',
      meta: { size: 'fill', grow: 1.6, phone: 'main', wrap: true },
      cell: ({ row }) => (
        <div className="flex flex-col min-w-0">
          <Text variant="body-strong" truncate>
            {row.original.name}
          </Text>
          {row.original.description ? (
            <div className="max-desk:hidden min-w-0">
              <Text variant="caption" tone="ink-3" truncate>
                {row.original.description}
              </Text>
            </div>
          ) : null}
        </div>
      ),
    }),
    ch.display({
      id: 'type',
      header: 'Type',
      meta: { size: 'sm', phone: 'status' },
      cell: ({ row }) => (
        <Badge variant="outline" tone="neutral" size="sm">
          {row.original.typeLabel}
        </Badge>
      ),
    }),
    ch.display({
      id: 'datasource',
      header: 'Datasource',
      meta: { size: 'lg', phone: 'hidden' },
      cell: ({ row }) => (
        <Text variant="body" tone="ink-3" truncate>
          {row.original.datasourceLabel}
        </Text>
      ),
    }),
    ch.display({
      id: 'dashboards',
      header: 'On dashboards',
      meta: { size: 'lg', phone: 'hidden' },
      cell: ({ row }) => (
        <Text variant="body" tone={row.original.dashboards.length > 0 ? 'ink' : 'ink-3'} truncate>
          {row.original.onDashboards}
        </Text>
      ),
    }),
    ch.display({
      id: 'updated',
      header: 'Updated',
      meta: { size: 'sm', phone: 'hidden' },
      cell: ({ row }) => (
        <Text variant="body" tone="ink-3">
          {row.original.updated}
        </Text>
      ),
    }),
    ch.display({
      id: 'actions',
      header: '',
      meta: { size: 'xs', align: 'end', phone: 'hidden' },
      cell: ({ row }) => (
        <div className="flex justify-end" onPointerDown={stop} onPointerUp={stop} onClick={stop} onKeyDown={stop}>
          <RowMenu row={row.original} actions={actions} />
        </div>
      ),
    }),
  ];
}

export interface ReportsScreenProps {
  /** The type filter from the URL (`?type=`), already applied by the server. */
  type?: ReportType;
  /** The reports in board order: grouped by area. */
  rows: ReportRow[];
}

/** The Reports list: type chips, search and the Datasource filter over the grouped table, then templates and Ask instead. */
export function ReportsScreen({ type, rows }: ReportsScreenProps) {
  const router = useRouter();
  const actions = useReportActions();
  const [search, setSearch] = React.useState('');
  const [datasources, setDatasources] = React.useState<string[]>([]);
  const [deleting, setDeleting] = React.useState<ReportRow | null>(null);
  const [adding, setAdding] = React.useState<ReportRow | null>(null);

  const visible = React.useMemo(() => filterRows(rows, search, datasources), [rows, search, datasources]);
  const filtered = search.trim() !== '' || datasources.length > 0;
  const options = React.useMemo(() => datasourceOptions(rows), [rows]);

  const rowActions = React.useMemo<RowActions>(
    () => ({
      onEdit: (row) => router.push(row.href),
      onDuplicate: (row) => actions.duplicate.mutate(row.id),
      onAddToDashboard: setAdding,
      onDelete: setDeleting,
      duplicating: actions.duplicate.isPending,
    }),
    [router, actions.duplicate],
  );
  const columns = React.useMemo(() => makeColumns(rowActions), [rowActions]);

  const clearFilters = () => {
    setSearch('');
    setDatasources([]);
    if (type) router.push(reportsUrl(), { scroll: false });
  };

  const emptyDescription = rows.length === 0 && !type
    ? 'No reports yet. Create your first report to start analyzing your transactions.'
    : 'No reports match.';

  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <div className="flex desk:justify-end">
        <Button asChild variant="secondary" className="max-desk:w-full">
          <Link href={CHAT_HREF} prefetch={false}>
            Ask the data
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-space-8 desk:flex-row desk:items-center">
        <TextField
          type="search"
          size="md"
          className="desk:w-container-xs"
          prefix={<Icon name="search" size="sm" />}
          clearable
          clearLabel="Clear search"
          placeholder="Search reports"
          value={search}
          onValueChange={setSearch}
        />
        <div className="flex gap-space-8 overflow-x-auto">
          <div className="shrink-0">
            <FilterChip selected={!type} onSelectedChange={() => router.push(reportsUrl(), { scroll: false })}>
              All
            </FilterChip>
          </div>
          {TYPE_CHIPS.map((chip) => (
            <div key={chip.type} className="shrink-0">
              <FilterChip
                selected={type === chip.type}
                onSelectedChange={() => router.push(reportsUrl(chip.type), { scroll: false })}
              >
                {chip.label}
              </FilterChip>
            </div>
          ))}
          <div className="shrink-0">
            <Select
              multiple
              searchable
              searchPlaceholder="Search datasources"
              options={options}
              value={datasources}
              onValueChange={(v) => setDatasources(v as string[])}
              trigger={
                <FilterChip
                  hasDropdown
                  selected={datasources.length > 0}
                  count={datasources.length > 0 ? datasources.length : undefined}
                >
                  Datasource
                </FilterChip>
              }
            />
          </div>
        </div>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={visible}
          getRowId={(row) => row.id}
          band={(row) => ({ key: row.areaId, label: row.areaLabel })}
          phoneSub={(row) => row.phoneSub}
          phoneActions={(row) => <RowMenu row={row} actions={rowActions} />}
          onRowSelect={(row) => router.push(row.href)}
          empty={
            <EmptyState
              compact
              description={emptyDescription}
              action={
                filtered || type
                  ? { label: 'Clear filters', variant: 'link', onSelect: clearFilters }
                  : undefined
              }
            />
          }
          stickyHeader={false}
        />
      </Card>

      <ReportsAside />

      {deleting ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open && !actions.remove.isPending) setDeleting(null);
          }}
          title="Delete report"
          description={`Delete ${deleting.name}?`}
          impact={[
            'The report and its settings go.',
            'Dashboards that use it will show the report as unavailable.',
            'Your transactions and other data stay.',
          ]}
          confirmLabel="Delete report"
          confirmLoading={actions.remove.isPending}
          onConfirm={() => actions.remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        />
      ) : null}

      {adding ? (
        <AddToDashboardDialog
          report={adding}
          adding={actions.addToDashboard.isPending}
          onAdd={(dashboardId) =>
            actions.addToDashboard.mutate({ dashboardId, report: adding }, { onSuccess: () => setAdding(null) })
          }
          onClose={() => setAdding(null)}
        />
      ) : null}
    </div>
  );
}

/** The list while the page loads. */
export function ReportsListSkeleton() {
  return (
    <Card>
      <DataTable columns={makeColumns({ onEdit: noop, onDuplicate: noop, onAddToDashboard: noop, onDelete: noop, duplicating: false })} data={[]} getRowId={(row) => row.id} loading skeletonRows={6} />
    </Card>
  );
}
