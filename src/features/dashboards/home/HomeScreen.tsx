'use client';

// Home: the greeting and a line of what needs you, the dashboard switcher and ⋯ menu, then the default dashboard's
// widgets (the same DashboardWidgets a dashboard page draws). Add widget saves straight to the shown dashboard
// with an Undo toast; Edit dashboard opens that dashboard's edit mode; with no default dashboard the page offers
// to restore Home or pick another.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Button, EmptyState, Icon, Menu, MenuItem, Select, Text } from '@/components/ds';
import { appHref } from '@/features/shell/routes';
import { ShellPage } from '@/features/shell/ShellPage';
import type { BuiltinWidgetResponse, WidgetParams } from '@/lib/dashboards.types';
import { useBuiltins } from '@/lib/query/hooks/useBuiltins';
import { useDashboards } from '@/lib/query/hooks/useDashboards';
import { useInboxSummary } from '@/lib/query/hooks/useInbox';
import { useReportsList } from '@/lib/query/hooks/useReports';
import type { ReportSummaryResponse } from '@/lib/reports.types';

import { useAddWidgetNow, useRestoreHome, useSaveWidgetSettings } from '../data/useDashboardActions';
import { builtinWidgetResponse, reportWidgetResponse } from '../editor/dashboardEditor.helpers';
import { withTitle } from '../editor/editorState';
import { WidgetPicker } from '../picker/WidgetPicker';
import { DASHBOARDS_HREF, editDashboardHref, NEW_DASHBOARD_HREF } from '../routes';
import { DashboardWidgets } from '../view/DashboardWidgets';
import { greetingLine, statusLine } from './homeModel';

const noop = () => undefined;

export interface HomeScreenProps {
  displayName?: string | null;
  /**
   * The Inbox count the server read. The shell's own nav counts subscribe to the same cache entry before this page's
   * hydration boundary runs, so the boundary holds that entry back until after render: the server render has no
   * count in the cache. The first render uses this instead, and the cache takes over once it has data.
   */
  needsYou?: number;
  /** The latest Gmail mailbox sync (ISO); the line leaves "synced …" out without it. */
  lastSyncedAt?: string;
  /** The server's clock (ISO), so the first render and hydration agree. */
  nowIso: string;
}

export function HomeScreen({ displayName, needsYou, lastSyncedAt, nowIso }: HomeScreenProps) {
  const router = useRouter();
  const now = React.useMemo(() => new Date(nowIso), [nowIso]);
  const { data: dashboards = [] } = useDashboards();
  const catalog = useBuiltins().data;
  const { data: inbox } = useInboxSummary();
  // The pick is tracked by id so the shown dashboard follows the cache (Widget settings, Add widget).
  const [currentId, setCurrentId] = React.useState<string | null>(null);
  const [picking, setPicking] = React.useState(false);
  const reports = useReportsList({ enabled: picking }).data;
  const add = useAddWidgetNow();
  const restoreHome = useRestoreHome(() => router.refresh());

  const active = dashboards.find((d) => d.id === currentId) ?? dashboards.find((d) => d.isDefault);
  const saveSettings = useSaveWidgetSettings(active, noop);

  if (!active) {
    return (
      <ShellPage title="Home">
        <EmptyState title="No default dashboard" description="Home shows your default dashboard. Restore the built-in Home or pick another.">
          <div className="flex w-full max-w-sm flex-col gap-space-8">
            <Button variant="primary" loading={restoreHome.pending} onClick={restoreHome.restore}>
              Restore default Home
            </Button>
            <Button asChild variant="secondary">
              <Link href={NEW_DASHBOARD_HREF}>Create dashboard</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={DASHBOARDS_HREF}>View dashboards</Link>
            </Button>
            <Button asChild variant="link">
              <Link href={appHref('/chat')} prefetch={false}>
                Ask the data
              </Link>
            </Button>
          </div>
        </EmptyState>
      </ShellPage>
    );
  }

  const addBuiltin = (def: BuiltinWidgetResponse, params: WidgetParams, title: string | null) =>
    add.mutate({ dashboard: active, widget: withTitle(builtinWidgetResponse(active.widgets, def, params), title) });
  const addReport = (report: ReportSummaryResponse, title: string | null) =>
    add.mutate({ dashboard: active, widget: withTitle(reportWidgetResponse(active.widgets, report), title) });

  return (
    <ShellPage title="Home">
      <div className="flex flex-col gap-space-16">
        <div className="flex flex-col gap-space-12 desk:flex-row desk:items-end desk:justify-between">
          <div className="flex min-w-0 flex-col gap-space-2">
            <Text as="h1" variant="page-title" family="display">
              {greetingLine(now, displayName)}
            </Text>
            <Text as="p" variant="body" tone="ink-3">
              {statusLine({ now, needsYou: inbox?.badge ?? needsYou, lastSyncedAt })}
            </Text>
          </div>
          <div className="flex items-center gap-space-8">
            <Select
              className="min-w-0 flex-1 desk:w-container-xs desk:flex-none"
              data-testid="home-switch"
              value={active.id}
              options={dashboards.map((d) => ({ value: d.id, label: d.name }))}
              onValueChange={(value) => setCurrentId(value as string)}
              action={{ label: 'View all dashboards', onSelect: () => router.push(DASHBOARDS_HREF) }}
            />
            <Menu
              align="end"
              trigger={
                <Button variant="secondary" iconOnly loading={add.isPending} aria-label="Dashboard actions">
                  <Icon name="more" size="sm" />
                </Button>
              }
            >
              <MenuItem disabled={add.isPending} onSelect={() => setPicking(true)}>
                Add widget
              </MenuItem>
              <MenuItem onSelect={() => router.push(editDashboardHref(active.id))}>Edit dashboard</MenuItem>
              <MenuItem onSelect={() => router.push(NEW_DASHBOARD_HREF)}>New dashboard</MenuItem>
            </Menu>
          </div>
        </div>

        {active.widgets.length === 0 ? (
          <EmptyState
            title="This dashboard has no widgets yet"
            description="Use Add widget to put built-ins or your saved reports here."
            action={{ label: 'Add widget', onSelect: () => !add.isPending && setPicking(true) }}
          />
        ) : (
          <DashboardWidgets widgets={active.widgets} catalog={catalog} dashboardName={active.name} onSaveSettings={add.isPending ? undefined : saveSettings} />
        )}
      </div>

      {picking ? (
        <WidgetPicker reports={reports ?? []} onAddBuiltin={addBuiltin} onAddReport={addReport} onClose={() => setPicking(false)} />
      ) : null}
    </ShellPage>
  );
}
