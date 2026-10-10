'use client';

// Thin wrapper over react-grid-layout (legacy/v1-compatible API). Maps widgets
// onto the DASHBOARD_GRID_COLUMNS-wide grid; drag/resize are enabled only in
// edit mode. The header of each edit card (`.dashboard-drag-handle`) is the
// drag handle. Below the md breakpoint, view mode stacks the widgets in one
// column instead (see DashboardStack); edit mode always keeps the grid. The
// server render and hydration use the grid, then the stack takes over after
// mount on a phone. Section headers (text widgets) are pinned to the full
// width and their own height: they drag, but never resize.

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import type { ReactNode } from 'react';
import RGL, { type Layout, WidthProvider } from 'react-grid-layout/legacy';

import { DASHBOARD_GRID_COLUMNS, isTextWidget, widgetMinW } from '@/lib/dashboards.helpers';
import type { WidgetResponse } from '@/lib/dashboards.types';
import { BELOW_MD_QUERY, useMediaQuery } from '@/lib/useMediaQuery';

import { DashboardStack, type WidgetFit } from './DashboardStack';

const GridLayout = WidthProvider(RGL);

// Horizontal margin stays small: with 100 columns it is paid 99 times across
// the row. Each cell pads itself by CELL_GUTTER_X instead, so neighbouring cards
// sit ~14px apart. The vertical margin is part of every widget's saved height
// (h rows × 1px + (h − 1) × 12px), so it must not change.
const GRID_MARGIN: [number, number] = [6, 12];
// Plus the cell's own 4px padding, the cards line up with the page's 16px gutter.
const GRID_CONTAINER_PADDING: [number, number] = [12, 12];

interface DashboardGridProps {
  widgets: WidgetResponse[];
  editing: boolean;
  onLayoutChange: (layout: Layout) => void;
  renderWidget: (widget: WidgetResponse, fit: WidgetFit) => ReactNode;
}

export function DashboardGrid({
  widgets,
  editing,
  onLayoutChange,
  renderWidget,
}: DashboardGridProps) {
  const isPhone = useMediaQuery(BELOW_MD_QUERY);

  if (isPhone && !editing) {
    return <DashboardStack widgets={widgets} renderWidget={renderWidget} />;
  }

  const layout: Layout = widgets.map((w) =>
    isTextWidget(w)
      ? {
          i: w.id,
          x: 0,
          y: w.layout.y,
          w: DASHBOARD_GRID_COLUMNS,
          h: w.layout.h,
          minW: DASHBOARD_GRID_COLUMNS,
          maxW: DASHBOARD_GRID_COLUMNS,
          minH: w.layout.h,
          maxH: w.layout.h,
          isResizable: false,
        }
      : {
          i: w.id,
          x: w.layout.x,
          y: w.layout.y,
          w: w.layout.w,
          h: w.layout.h,
          // Built-ins carry their own minimum (e.g. full width for bills/upcoming).
          minW: Math.min(widgetMinW(w), DASHBOARD_GRID_COLUMNS),
          minH: 1,
        },
  );

  return (
    <GridLayout
      className="layout"
      layout={layout}
      cols={DASHBOARD_GRID_COLUMNS}
      rowHeight={1}
      margin={GRID_MARGIN}
      containerPadding={GRID_CONTAINER_PADDING}
      isDraggable={editing}
      isResizable={editing}
      draggableHandle=".dashboard-drag-handle"
      onLayoutChange={onLayoutChange}
    >
      {widgets.map((w) => (
        <div key={w.id}>
          <div className="h-full px-1">{renderWidget(w, 'fill')}</div>
        </div>
      ))}
    </GridLayout>
  );
}
