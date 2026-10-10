'use client';

// What a dashboard widget IS, for its frame: the icon in its header chip, the
// short subtitle under its title, where "Open" drills through to, and the
// shape of its content (for the loading skeleton and the mobile stack height).

import { BarChart3, Gauge, LayoutGrid, type LucideIcon, Table2 } from 'lucide-react';
import { createElement } from 'react';

import { isBuiltinWidget } from '@/lib/dashboards.helpers';
import type { WidgetResponse } from '@/lib/dashboards.types';

import { SubtitleText } from './builtins/BuiltinSubtitle';
import { builtinEntryOf, type PhoneSlot, serverSubtitle } from './builtins/registry';

/** The content shape: a single figure, a chart, rows, or a built-in's own component. */
export type WidgetVisualKind = 'kpi' | 'chart' | 'table' | 'component';

export function widgetVisualKind(widget: WidgetResponse): WidgetVisualKind {
  if (isBuiltinWidget(widget) && widget.builtin?.kind === 'component') return 'component';
  const type = isBuiltinWidget(widget) ? widget.builtin?.templateType : widget.report?.type;
  if (type === 'KPI') return 'kpi';
  if (type === 'CHART') return 'chart';
  return 'table';
}

const KPI_SLOT: PhoneSlot = { fit: 'fill', className: 'h-[140px]' };
const TALL_SLOT: PhoneSlot = { fit: 'fill', className: 'h-80' };

/**
 * A widget's slot in the phone stack: the built-in's own, else by content
 * shape — component built-ins size to their content, KPIs get 140px, charts
 * and tables 320px.
 */
export function phoneSlot(widget: WidgetResponse): PhoneSlot {
  const own = builtinEntryOf(widget)?.phone;
  if (own) return own;
  const kind = widgetVisualKind(widget);
  if (kind === 'component') return { fit: 'content' };
  return kind === 'kpi' ? KPI_SLOT : TALL_SLOT;
}

const KIND_ICONS: Record<WidgetVisualKind, LucideIcon> = {
  kpi: Gauge,
  chart: BarChart3,
  table: Table2,
  component: LayoutGrid,
};

/** A built-in's own icon (wallet for net worth, inbox, calendar, card), else one for its content shape. */
export function widgetIcon(widget: WidgetResponse): LucideIcon {
  return builtinEntryOf(widget)?.icon ?? KIND_ICONS[widgetVisualKind(widget)];
}

/** The header chip's icon element (see `widgetIcon`). */
export function WidgetIcon({ widget, className }: { widget: WidgetResponse; className?: string }) {
  return createElement(widgetIcon(widget), { className, 'aria-hidden': true });
}

/**
 * Where the header's "Open" button goes: a built-in's own page (Accounts, Inbox, Upcoming).
 * A saved report gets no "Open": its page is the report editor, already offered as
 * "Edit report" in the overflow menu.
 */
export function widgetHref(widget: WidgetResponse, available: boolean): string | null {
  if (!available || !isBuiltinWidget(widget)) return null;
  return widget.builtin?.href ?? null;
}

/**
 * The muted line under a widget's title: the registry's param-aware subtitle,
 * else the server's static one; nothing for saved reports.
 */
export function WidgetSubtitle({ widget }: { widget: WidgetResponse }) {
  if (!isBuiltinWidget(widget)) return null;
  const line = builtinEntryOf(widget)?.subtitle?.(widget) ?? serverSubtitle(widget);
  if (line == null) return null;
  return typeof line === 'string' ? <SubtitleText>{line}</SubtitleText> : line;
}
