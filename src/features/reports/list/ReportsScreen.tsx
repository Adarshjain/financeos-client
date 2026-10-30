'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

import { Badge } from '@/components/ds/Badge/Badge';
import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { DataTable } from '@/components/ds/DataTable/DataTable';
import { createDataTableColumnHelper } from '@/components/ds/DataTable/types';
import { ConfirmDialog } from '@/components/ds/Dialog/Dialog';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { FilterBar } from '@/components/ds/FilterBar/FilterBar';
import { FilterChip } from '@/components/ds/FilterChip/FilterChip';
import { Icon } from '@/components/ds/Icon/Icon';
import { Menu } from '@/components/ds/Menu/Menu';
import { Select } from '@/components/ds/Select/Select';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { Text } from '@/components/ds/Text/Text';
import { replaceUrl } from '@/lib/urlState';

import { AddToDashboardDialog } from './AddToDashboardDialog';
import { ReportsAside } from './ReportsAside';
import {
  filterRows,
  NEW_REPORT_HREF,
  parseReportsType,
  type ReportKind,
  type ReportRow,
  reportsUrl,
  TYPE_CHIPS,
} from './reportsListModel';
import { ReportsTabs } from './ReportsTabs';
import { useReportMutations } from './useReportMutations';

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

/** The ⋯ menu of a report: the last cell of the row, at the trailing edge on desktop and phone. */
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
      <Menu.Item onSelect={() => actions.onEdit(row)}>Edit</Menu.Item>
      <Menu.Item disabled={actions.duplicating} onSelect={() => actions.onDuplicate(row)}>
        Duplicate
      </Menu.Item>
      <Menu.Item onSelect={() => actions.onAddToDashboard(row)}>Add to dashboard</Menu.Item>
      <Menu.Item tone="danger" onSelect={() => actions.onDelete(row)}>
        Delete
      </Menu.Item>
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
          <div className="desk:hidden min-w-0">
            <Text variant="caption" tone="ink-3" truncate>
              {row.original.phoneSub}
            </Text>
          </div>
        </div>
      ),
    }),
    ch.display({
      id: 'type',
      header: 'Type',
      meta: { size: 'md', phone: 'hidden' },
      cell: ({ row }) => (
        <Badge tone="neutral" size="md">
          {row.original.typeLabel}
        </Badge>
      ),
    }),
    ch.display({
      id: 'datasource',
      header: 'Datasource',
      meta: { size: 'lg', phone: 'hidden' },
      cell: ({ row }) => (
        <Text variant="body" tone="ink-2" truncate>
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
      meta: { size: 'xs', align: 'end', phone: 'amount' },
      cell: ({ row }) => (
        <div
          className="flex h-full items-center justify-end"
          onPointerDown={stop}
          onPointerUp={stop}
          onClick={stop}
          onKeyDown={stop}
        >
          <RowMenu row={row.original} actions={actions} />
        </div>
      ),
    }),
  ];
}

export interface ReportsScreenProps {
  /** The type filter from the URL (`?type=`) at load. It is client state after that: the chips change it and the URL without a server round trip. */
  type?: ReportKind;
  /** The reports in board order: grouped by area. */
  rows: ReportRow[];
}

/** The Reports list: tabs, then search and the type chips in one row over the grouped table, then templates and Ask instead. */
export function ReportsScreen({ type: initialType, rows }: ReportsScreenProps) {
  const router = useRouter();
  const actions = useReportMutations();
  const [search, setSearch] = React.useState('');
  const [type, setTypeState] = React.useState<ReportKind | undefined>(initialType);
  // Back/forward (or any other URL change) after load brings the chip with it.
  const urlType = useSearchParams()?.get('type') ?? undefined;
  const seenUrlType = React.useRef(urlType);
  React.useEffect(() => {
    if (seenUrlType.current === urlType) return;
    seenUrlType.current = urlType;
    setTypeState(parseReportsType({ type: urlType }));
  }, [urlType]);
  /** Filtering is client-side: set the chip and the URL (shareable, reload-safe) without asking the server again. */
  const setType = (next?: ReportKind) => {
    setTypeState(next);
    replaceUrl(reportsUrl(next));
  };
  const [deleting, setDeleting] = React.useState<ReportRow | null>(null);
  const [adding, setAdding] = React.useState<ReportRow | null>(null);

  const visible = React.useMemo(() => filterRows(rows, search, type), [rows, search, type]);
  const filtered = search.trim() !== '';

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
    if (type) setType(undefined);
  };

  const firstUse = rows.length === 0 && !type;

  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <ReportsTabs />

      <FilterBar
        size="md"
        search={{ value: search, onValueChange: setSearch }}
        changed={filtered || Boolean(type)}
        onReset={clearFilters}
      >
        <Select
          value={type ?? 'all'}
          options={[{ value: 'all', label: 'All types' }, ...TYPE_CHIPS.map((chip) => ({ value: chip.type, label: chip.label }))]}
          onValueChange={(v) => setType(v === 'all' ? undefined : (v as ReportKind))}
          trigger={
            <FilterChip
              size="md"
              className="shrink-0"
              hasDropdown
              changed={Boolean(type)}
              onReset={() => setType(undefined)}
            >
              {TYPE_CHIPS.find((chip) => chip.type === type)?.label ?? 'Type'}
            </FilterChip>
          }
        />
      </FilterBar>

      <Card>
        <DataTable
          columns={columns}
          data={visible}
          getRowId={(row) => row.id}
          band={(row) => ({ key: row.areaId, label: row.areaLabel })}
          onRowSelect={(row) => router.push(row.href)}
          empty={
            firstUse ? (
              <EmptyState
                title="No reports yet"
                description="Add your first report to start analyzing your transactions."
                action={{ label: 'Add report', href: NEW_REPORT_HREF }}
              />
            ) : (
              <EmptyState
                title="No reports match"
                description="Try a different search or filter."
                action={filtered || type ? { label: 'Clear filters', variant: 'secondary', onSelect: clearFilters } : undefined}
              />
            )
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
          title="Delete report?"
          description={`${deleting.name} will be deleted. This can't be undone.`}
          impact={[
            'The report and its settings go.',
            'Dashboards that use it will show the report as unavailable.',
            'Your transactions and other data stay.',
          ]}
          confirmLabel="Delete"
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
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <ReportsTabs />
      <FilterBar size="md" search={{ value: '', onValueChange: noop }}>
        <Skeleton height={32} width={72} className="shrink-0" />
      </FilterBar>
      <Card>
      <DataTable columns={makeColumns({ onEdit: noop, onDuplicate: noop, onAddToDashboard: noop, onDelete: noop, duplicating: false })} data={[]} getRowId={(row) => row.id} loading skeletonRows={6} />
      </Card>
    </div>
  );
}
