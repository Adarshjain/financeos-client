'use client';

// Read-only dashboard renderer. Lays the widgets out on the (non-editable) grid
// and lets each DashboardWidgetView run its referenced report via its own
// query, exactly as the editor's VIEW mode does. Used by the landing/home view
// to render the user's default dashboard — whose widget data the landing page
// has already prefetched into the query cache (see `dashboard/page.tsx`), so
// no props need to be threaded through here for that.

import { Card } from '@/components/ui/card';
import type { DashboardResponse, WidgetParams } from '@/lib/dashboards.types';

import { DashboardGrid } from './DashboardGrid';
import { DashboardWidgetView } from './DashboardWidgetView';

interface DashboardViewProps {
  dashboard: DashboardResponse;
  /** Persists a built-in's new params from its "Widget settings" (omitted = no settings item). */
  onWidgetParamsChange?: (widgetId: string, params: WidgetParams) => Promise<void>;
}

export function DashboardView({ dashboard, onWidgetParamsChange }: DashboardViewProps) {
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
      renderWidget={(w, fit) => (
        <DashboardWidgetView
          widget={w}
          fit={fit}
          onParamsChange={onWidgetParamsChange ? (params) => onWidgetParamsChange(w.id, params) : undefined}
        />
      )}
    />
  );
}
