'use client';

// A dashboard's widgets as they read: the Dinero grid of widget frames and section headers, in the saved order and
// widths. No page around it, so Home (the default dashboard under its greeting) reuses it as it is.

import React from 'react';

import { WidgetGrid, type WidgetGridItem } from '@/components/ds';
import { isTextWidget, widgetTitle } from '@/lib/dashboards.helpers';
import type { BuiltinWidgetResponse, WidgetResponse } from '@/lib/dashboards.types';

import { DashboardWidgetFrame } from '../frame/DashboardWidgetFrame';
import { HeaderWidget } from '../frame/HeaderWidget';
import type { WidgetSettingsChange } from '../frame/WidgetSettingsDialog';
import { orderWidgets, widthStepOf } from '../layout/widgetLayout';

export interface DashboardWidgetsProps {
  widgets: readonly WidgetResponse[];
  catalog?: readonly BuiltinWidgetResponse[];
  dashboardName?: string;
  /** Saves one widget's settings straight away; omitted = no "Widget settings" in the menus. */
  onSaveSettings?: (widgetId: string, change: WidgetSettingsChange) => Promise<void>;
}

export function DashboardWidgets({ widgets, catalog, dashboardName, onSaveSettings }: DashboardWidgetsProps) {
  const items: WidgetGridItem[] = orderWidgets(widgets).map((widget) => ({
    id: widget.id,
    width: widthStepOf(widget),
    resizable: !isTextWidget(widget),
    label: widgetTitle(widget),
    children: isTextWidget(widget) ? (
      <HeaderWidget widget={widget} />
    ) : (
      <DashboardWidgetFrame
        widget={widget}
        catalog={catalog}
        dashboardName={dashboardName}
        onSaveSettings={onSaveSettings ? (change) => onSaveSettings(widget.id, change) : undefined}
      />
    ),
  }));
  return <WidgetGrid items={items} />;
}
