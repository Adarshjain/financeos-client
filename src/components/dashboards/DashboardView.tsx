'use client';

// Read-only dashboard renderer. Lays the widgets out on the (non-editable) grid
// and lets each DashboardWidgetView run its referenced report via the reports
// client, exactly as the editor's VIEW mode does. Used by the landing/home view
// to render the user's default dashboard.

import { Card } from '@/components/ui/card';
import type { WidgetPrefetchMap } from '@/lib/dashboards.server';
import type { DashboardResponse } from '@/lib/dashboards.types';

import { DashboardGrid } from './DashboardGrid';
import { DashboardWidgetView } from './DashboardWidgetView';

interface DashboardViewProps {
  dashboard: DashboardResponse;
  /**
   * Widget data already fetched on the server. Present for the dashboard shown
   * on first paint; absent when the user switches dashboards client-side, where
   * the widgets fetch their own data as before.
   */
  prefetched?: WidgetPrefetchMap;
}

export function DashboardView({ dashboard, prefetched }: DashboardViewProps) {
  if (dashboard.widgets.length === 0) {
    return (
      <Card>
        <div className="py-16 text-center">
          <p className="mb-2 text-slate-600 dark:text-slate-400">
            This dashboard has no widgets yet
          </p>
          <p className="text-sm text-slate-500">
            Open it to add report widgets.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <DashboardGrid
      widgets={dashboard.widgets}
      editing={false}
      onLayoutChange={() => {}}
      renderWidget={(w) => (
        <DashboardWidgetView
          widget={w}
          initialData={prefetched?.[w.id]?.data ?? null}
          initialError={prefetched?.[w.id]?.error ?? null}
        />
      )}
    />
  );
}
