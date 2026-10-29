'use client';

// The widgets while editing: the same frames, arranged by drag (grip) and corner resize. Each item's own controls
// sit top-right: Settings (a built-in with params), Edit header (a header) and Remove. Items are inert while
// arranging (the grid does that), so a header is edited in its dialog.

import React from 'react';

import { Button, Icon, WidgetGrid, type WidgetGridItem, type WidgetGridLayoutItem } from '@/components/ds';
import { widgetBuiltinKey } from '@/features/dashboards/frame/widgetFrameModel';
import { toGridLayout, widthStepOf } from '@/features/dashboards/layout/widgetLayoutModel';
import { isBuiltinWidget, isTextWidget, widgetTitle } from '@/lib/dashboards.helpers';
import type { BuiltinWidgetResponse, WidgetResponse } from '@/lib/dashboards.types';

import { DashboardWidgetFrame } from '../frame/DashboardWidgetFrame';
import { HeaderWidget } from '../frame/HeaderWidget';

export interface DashboardEditGridProps {
  widgets: readonly WidgetResponse[];
  catalog: readonly BuiltinWidgetResponse[];
  /** The problem with a widget by id, shown on it. */
  issues: ReadonlyMap<string, string>;
  footer?: React.ReactNode;
  onLayoutChange: (layout: WidgetGridLayoutItem[]) => void;
  onRemove: (id: string) => void;
  onOpenSettings: (id: string) => void;
  onUpdateHeader: (id: string, change: { title?: string; description?: string }) => void;
}

export function DashboardEditGrid({ widgets, catalog, issues, footer, onLayoutChange, onRemove, onOpenSettings, onUpdateHeader }: DashboardEditGridProps) {
  const items: WidgetGridItem[] = widgets.map((widget) => {
    const issue = issues.get(widget.id);
    const header = isTextWidget(widget);
    const key = widgetBuiltinKey(widget);
    const builtin = isBuiltinWidget(widget);
    // Every widget has Settings (a title in place of its own; a built-in's params too, once the catalog says which).
    const settings = !header && (!builtin || (key != null && catalog.some((d) => d.key === key)));
    // The control a "fix the problem" focus lands on: the one that fixes it, else the remove button.
    const firstControl = settings ? 'settings' : 'remove';
    const mark = (control: string) => (issue && control === firstControl ? { 'data-dashboard-problem': '' } : {});
    const name = widgetTitle(widget);
    return {
      id: widget.id,
      width: widthStepOf(widget),
      resizable: !header,
      interactive: header,
      label: name,
      editActions: (
        <>
          {settings ? (
            <Button variant="secondary" size="sm" onClick={() => onOpenSettings(widget.id)} {...mark('settings')}>
              Settings
            </Button>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            iconOnly
            aria-label={`${header ? 'Remove header' : 'Remove widget'} ${name}`}
            onClick={() => onRemove(widget.id)}
            {...mark('remove')}
          >
            <Icon name="delete" size="sm" />
          </Button>
        </>
      ),
      children: header ? (
        <div className="pt-space-40">
          <HeaderWidget widget={widget} issue={issue} onChange={(change) => onUpdateHeader(widget.id, change)} />
        </div>
      ) : (
        <div className="pt-space-40">
          <DashboardWidgetFrame widget={widget} catalog={catalog} editing issue={issue} />
        </div>
      ),
    };
  });
  return <WidgetGrid editing items={items} layout={toGridLayout(widgets)} onLayoutChange={onLayoutChange} footer={footer} />;
}
