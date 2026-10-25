'use client';

// The Dashboards list: the Dashboards · Reports tabs, "Restore default Home" while there is no Home, a card per
// dashboard (name, Default badge, description · widgets · updated, a ⋯ menu), then the built-in widgets as a
// reference. Delete confirms first; set and clear default confirm with a toast.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Badge, Button, Card, ConfirmDialog, EmptyState, Icon, type ListRowAction, MenuContent, MenuItem, MenuRoot, MenuTrigger, Skeleton } from '@/components/ds';
import { ReportsTabs } from '@/features/reports/list/ReportsTabs';
import type { DashboardResponse } from '@/lib/dashboards.types';
import { useBuiltins } from '@/lib/query/hooks/useBuiltins';
import { useDashboards } from '@/lib/query/hooks/useDashboards';
import { useReportsList } from '@/lib/query/hooks/useReports';

import { useDeleteDashboard, useRestoreHome, useToggleDefault } from '../data/useDashboardActions';
import { dashboardHref, editDashboardHref, NEW_DASHBOARD_HREF } from '../routes';
import { builtinsSubtitle, canRestoreHome, dashboardSubtitle } from './dashboardsList';

const noop = () => undefined;

export function DashboardsScreen() {
  const router = useRouter();
  const { data: dashboards = [] } = useDashboards();
  const { data: builtins = [] } = useBuiltins();
  const { data: reports } = useReportsList();
  const toggleDefault = useToggleDefault(noop);
  const remove = useDeleteDashboard();
  const home = useRestoreHome();
  const [deleting, setDeleting] = React.useState<DashboardResponse | null>(null);

  const actionsFor = (d: DashboardResponse): ListRowAction[] => [
    { id: 'edit', label: 'Edit', onSelect: () => router.push(editDashboardHref(d.id)) },
    {
      id: 'default',
      label: d.isDefault ? 'Clear default' : 'Set as default',
      // Refuses rather than overwrite a dashboard that changed since this list was read.
      onSelect: () => toggleDefault.mutate({ id: d.id, makeDefault: !d.isDefault, updatedAt: d.updatedAt }),
    },
    { id: 'delete', label: 'Delete dashboard', destructive: true, onSelect: () => setDeleting(d) },
  ];

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
          <div className="grid grid-cols-1 gap-space-12 desk:grid-cols-3 desk:gap-space-16 desk:items-start">
            {dashboards.map((d) => (
              <Card
                key={d.id}
                data-testid="dashboard-row"
                data-dashboard-id={d.id}
                title={
                  <span className="flex items-center gap-space-8">
                    <Button variant="link" asChild className="min-w-0 truncate">
                      <Link href={dashboardHref(d.id)}>{d.name}</Link>
                    </Button>
                    {d.isDefault ? <Badge tone="success">Default</Badge> : null}
                  </span>
                }
                subtitle={dashboardSubtitle(d)}
                action={
                  <MenuRoot>
                    <MenuTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" iconOnly aria-label="More options" icon={<Icon name="more" size="sm" />} />
                    </MenuTrigger>
                    <MenuContent align="end">
                      {actionsFor(d).map((act) => (
                        <MenuItem key={act.id} destructive={act.destructive} onSelect={() => act.onSelect()}>
                          {act.label}
                        </MenuItem>
                      ))}
                    </MenuContent>
                  </MenuRoot>
                }
              />
            ))}
          </div>
        </>
      )}

      <Card title="Built-in widgets" subtitle={builtinsSubtitle(builtins.length)}>
        <div className="flex flex-wrap gap-space-6 px-space-16 pb-space-14">
          {builtins.map((b) => (
            <Badge key={b.key} variant="outline" shape="rounded" size="md" tone="neutral">
              {b.label}
            </Badge>
          ))}
        </div>
      </Card>

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
      <div className="grid grid-cols-1 gap-space-12 desk:grid-cols-3 desk:gap-space-16">
        <Skeleton height={64} />
        <Skeleton height={64} />
        <Skeleton height={64} />
      </div>
      <Skeleton height={240} />
    </div>
  );
}
