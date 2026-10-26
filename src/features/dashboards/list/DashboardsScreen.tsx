'use client';

// The Dashboards list, built like the Reports list: the Dashboards · Reports tabs, "Restore default Home" while
// there is no Home, a search, then a table (name and description, widgets, Default badge, updated, a ⋯ menu).
// A row opens the dashboard. Delete confirms first; set and clear default confirm with a toast.

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
  Icon,
  Menu,
  MenuItem,
  Text,
  TextField,
} from '@/components/ds';
import { ReportsTabs } from '@/features/reports/list/ReportsTabs';
import type { DashboardResponse } from '@/lib/dashboards.types';
import { useDashboards } from '@/lib/query/hooks/useDashboards';
import { useReportsList } from '@/lib/query/hooks/useReports';

import { useDeleteDashboard, useRestoreHome, useToggleDefault } from '../data/useDashboardActions';
import { editDashboardHref, NEW_DASHBOARD_HREF } from '../routes';
import { canRestoreHome, type DashboardRow, dashboardRows, filterDashboardRows } from './dashboardsList';

/** A press on a control inside a row must not also open the row. */
const stop = (e: React.SyntheticEvent) => e.stopPropagation();

const noop = () => undefined;

const ch = createDataTableColumnHelper<DashboardRow>();

interface RowActions {
  onEdit: (row: DashboardRow) => void;
  onToggleDefault: (row: DashboardRow) => void;
  onDelete: (row: DashboardRow) => void;
}

/** The ⋯ menu of a dashboard: the last cell of the row, at the trailing edge on desktop and phone. */
function RowMenu({ row, actions }: { row: DashboardRow; actions: RowActions }) {
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
      <MenuItem onSelect={() => actions.onToggleDefault(row)}>{row.isDefault ? 'Clear default' : 'Set as default'}</MenuItem>
      <MenuItem destructive onSelect={() => actions.onDelete(row)}>
        Delete dashboard
      </MenuItem>
    </Menu>
  );
}

function makeColumns(actions: RowActions) {
  return [
    ch.display({
      id: 'dashboard',
      header: 'Dashboard',
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
      id: 'widgets',
      header: 'Widgets',
      meta: { size: 'sm', phone: 'hidden' },
      cell: ({ row }) => (
        <Text variant="body" tone="ink-2">
          {row.original.widgets}
        </Text>
      ),
    }),
    ch.display({
      id: 'default',
      header: 'Default',
      meta: { size: 'md', phone: 'hidden' },
      cell: ({ row }) => (row.original.isDefault ? <Badge tone="success">Default</Badge> : null),
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

export function DashboardsScreen() {
  const router = useRouter();
  const { data: dashboards = [] } = useDashboards();
  const { data: reports } = useReportsList();
  const toggleDefault = useToggleDefault(noop);
  const remove = useDeleteDashboard();
  const home = useRestoreHome();
  const [search, setSearch] = React.useState('');
  const [deleting, setDeleting] = React.useState<DashboardResponse | null>(null);

  const rows = React.useMemo(() => dashboardRows(dashboards), [dashboards]);
  const visible = React.useMemo(() => filterDashboardRows(rows, search), [rows, search]);

  const rowActions = React.useMemo<RowActions>(
    () => ({
      onEdit: (row) => router.push(editDashboardHref(row.id)),
      // Refuses rather than overwrite a dashboard that changed since this list was read.
      onToggleDefault: (row) => toggleDefault.mutate({ id: row.id, makeDefault: !row.isDefault, updatedAt: row.updatedAt }),
      onDelete: (row) => setDeleting(dashboards.find((d) => d.id === row.id) ?? null),
    }),
    [router, toggleDefault, dashboards],
  );
  const columns = React.useMemo(() => makeColumns(rowActions), [rowActions]);

  const restore = (
    <Button variant="secondary" className="max-desk:w-full desk:self-end" loading={home.pending} onClick={home.restore}>
      Restore default Home
    </Button>
  );

  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <ReportsTabs active="dashboards" dashboards={dashboards.length} reports={reports?.length} />

      {dashboards.length === 0 ? (
        <Card>
          <EmptyState
            title="No dashboards yet"
            description="Make one from built-in widgets and your saved reports."
            action={{ label: 'New dashboard', onSelect: () => router.push(NEW_DASHBOARD_HREF) }}
            secondaryAction={{ label: 'Restore default Home', onSelect: home.restore }}
          />
        </Card>
      ) : (
        <>
          {canRestoreHome(dashboards) ? restore : null}

          <div className="-mx-space-16 -mt-space-4 -mb-space-8 flex gap-space-8 overflow-x-auto px-space-16 py-space-4 scrollbar-none desk:-mx-space-4 desk:-mb-space-12 desk:min-w-0 desk:px-space-4">
            <TextField
              type="search"
              size="md"
              className="min-w-container-xs flex-1 desk:w-container-xs desk:flex-none"
              prefix={<Icon name="search" size="sm" />}
              clearable
              placeholder="Search dashboards"
              value={search}
              onValueChange={setSearch}
            />
          </div>

          <Card>
            <DataTable
              columns={columns}
              data={visible}
              getRowId={(row) => row.id}
              onRowSelect={(row) => router.push(row.href)}
              empty={
                <EmptyState
                  compact
                  description="No dashboards match."
                  action={{ label: 'Clear search', variant: 'link', onSelect: () => setSearch('') }}
                />
              }
              stickyHeader={false}
            />
          </Card>
        </>
      )}

      {deleting ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open && !remove.isPending) setDeleting(null);
          }}
          title={`Delete ${deleting.name}?`}
          description="This cannot be undone. Its widgets go with it; your saved reports stay."
          confirmLabel="Delete dashboard"
          confirmLoading={remove.isPending}
          onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        />
      ) : null}
    </div>
  );
}

/** The list while the page loads. */
export function DashboardsListSkeleton() {
  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <ReportsTabs active="dashboards" />
      <Card>
        <DataTable
          columns={makeColumns({ onEdit: noop, onToggleDefault: noop, onDelete: noop })}
          data={[]}
          getRowId={(row) => row.id}
          loading
          skeletonRows={6}
        />
      </Card>
    </div>
  );
}
