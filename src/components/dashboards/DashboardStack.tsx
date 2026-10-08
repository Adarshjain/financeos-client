'use client';

// Phone layout (view mode only): the widgets as one column, in reading order
// (layout y, then x), each at a height that suits its content. Half-width grid
// cells are unreadably narrow on a phone, so the grid is not used there.

import type { ReactNode } from 'react';

import type { WidgetResponse } from '@/lib/dashboards.types';

import { widgetVisualKind } from './widgetMeta';

export type WidgetFit = 'fill' | 'content';

interface DashboardStackProps {
  widgets: WidgetResponse[];
  renderWidget: (widget: WidgetResponse, fit: WidgetFit) => ReactNode;
}

/** Reading order: top to bottom, then left to right. */
export function stackOrder(widgets: WidgetResponse[]): WidgetResponse[] {
  return [...widgets].sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x);
}

export function DashboardStack({ widgets, renderWidget }: DashboardStackProps) {
  return (
    <div className="flex flex-col gap-3 px-4 pt-3" data-testid="dashboard-stack">
      {stackOrder(widgets).map((w) => {
        const kind = widgetVisualKind(w);
        // Component built-ins (Inbox, Bills due) size to their content, capped with internal scroll.
        if (kind === 'component') return <div key={w.id}>{renderWidget(w, 'content')}</div>;
        return (
          <div key={w.id} className={kind === 'kpi' ? 'h-[140px]' : 'h-80'}>
            {renderWidget(w, 'fill')}
          </div>
        );
      })}
    </div>
  );
}
