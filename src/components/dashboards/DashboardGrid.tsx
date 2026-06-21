'use client';

// Thin wrapper over react-grid-layout (legacy/v1-compatible API). Maps widgets
// onto the 12-column grid; drag/resize are enabled only in edit mode. The
// header of each edit card (`.dashboard-drag-handle`) is the drag handle.

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import type { ReactNode } from 'react';
import RGL, { type Layout, WidthProvider } from 'react-grid-layout/legacy';

import type { WidgetResponse } from '@/lib/dashboards.types';

const GridLayout = WidthProvider(RGL);

interface DashboardGridProps {
  widgets: WidgetResponse[];
  editing: boolean;
  onLayoutChange: (layout: Layout) => void;
  renderWidget: (widget: WidgetResponse) => ReactNode;
}

export function DashboardGrid({
  widgets,
  editing,
  onLayoutChange,
  renderWidget,
}: DashboardGridProps) {
  const layout: Layout = widgets.map((w) => ({
    i: w.id,
    x: w.layout.x,
    y: w.layout.y,
    w: w.layout.w,
    h: w.layout.h,
    minW: 2,
    minH: 2,
  }));

  return (
    <GridLayout
      className="layout"
      layout={layout}
      cols={12}
      rowHeight={64}
      margin={[12, 12]}
      isDraggable={editing}
      isResizable={editing}
      draggableHandle=".dashboard-drag-handle"
      onLayoutChange={onLayoutChange}
    >
      {widgets.map((w) => (
        <div key={w.id}>{renderWidget(w)}</div>
      ))}
    </GridLayout>
  );
}
