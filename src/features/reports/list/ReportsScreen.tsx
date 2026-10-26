'use client';

import { useRouter, useSearchParams } from 'next/navigation';
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
  Text,
  TextField,
} from '@/components/ds';

import { AddToDashboardDialog } from './AddToDashboardDialog';
import { ReportsAside } from './ReportsAside';
import {
  filterRows,
  parseReportsType,
  type ReportKind,
  type ReportRow,
  reportsUrl,
  TYPE_CHIPS,
  typeCounts,
} from './reportsList';
import { ReportsTabs } from './ReportsTabs';
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
  /** How many dashboards there are (loaded with the list); the tab shows no count when unknown. */
  dashboards?: number;
  /** The reports in board order: grouped by area. */
  rows: ReportRow[];
}

/** The Reports list: tabs, then search and the type chips in one row over the grouped table, then templates and Ask instead. */
export function ReportsScreen({ type: initialType, dashboards, rows }: ReportsScreenProps) {
  const router = useRouter();
  const actions = useReportActions();
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
    window.history.replaceState(null, '', reportsUrl(next));
  };
  const [deleting, setDeleting] = React.useState<ReportRow | null>(null);
  const [adding, setAdding] = React.useState<ReportRow | null>(null);

  const visible = React.useMemo(() => filterRows(rows, search, type), [rows, search, type]);
  const counts = React.useMemo(() => typeCounts(rows), [rows]);
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

  const emptyDescription = rows.length === 0 && !type
    ? 'No reports yet. Create your first report to start analyzing your transactions.'
    : 'No reports match.';

  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <ReportsTabs dashboards={dashboards} reports={rows.length} />

      <div className="-mx-space-16 -mt-space-4 -mb-space-8 flex gap-space-8 overflow-x-auto px-space-16 py-space-4 scrollbar-none desk:-mx-space-4 desk:-mb-space-12 desk:min-w-0 desk:px-space-4">
        <TextField
          type="search"
          size="md"
          className="min-w-container-xs flex-1 desk:w-container-xs desk:flex-none"
          prefix={<Icon name="search" size="sm" />}
          clearable
          placeholder="Search reports"
          value={search}
          onValueChange={setSearch}
        />
        <div className="flex shrink-0 gap-space-8">
          <FilterChip
            size="md"
            shape="rounded"
            selected={!type}
            onSelectedChange={() => setType(undefined)}
          >
            All
          </FilterChip>
          {TYPE_CHIPS.map((chip) => (
            <FilterChip
              key={chip.type}
              size="md"
              shape="rounded"
              selected={type === chip.type}
              count={counts[chip.type]}
              onSelectedChange={() => setType(chip.type)}
            >
              {chip.label}
            </FilterChip>
          ))}
        </div>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={visible}
          getRowId={(row) => row.id}
          band={(row) => ({ key: row.areaId, label: row.areaLabel })}
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
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <ReportsTabs />
      <Card>
      <DataTable columns={makeColumns({ onEdit: noop, onDuplicate: noop, onAddToDashboard: noop, onDelete: noop, duplicating: false })} data={[]} getRowId={(row) => row.id} loading skeletonRows={6} />
      </Card>
    </div>
  );
}
