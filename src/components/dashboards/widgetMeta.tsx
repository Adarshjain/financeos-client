'use client';

// What a dashboard widget IS, for its frame: the icon in its header chip, the
// short subtitle under its title, where "Open" drills through to, and the
// shape of its content (for the loading skeleton and the mobile stack height).

import {
  BarChart3,
  CalendarClock,
  CreditCard,
  Gauge,
  Inbox,
  LayoutGrid,
  type LucideIcon,
  Table2,
  Wallet,
} from 'lucide-react';
import { createElement } from 'react';

import {
  BUILTIN_ATTENTION,
  BUILTIN_BILLS_DUE,
  BUILTIN_NET_WORTH,
  BUILTIN_UPCOMING,
  isBuiltinWidget,
  widgetParams,
} from '@/lib/dashboards.helpers';
import type { WidgetResponse } from '@/lib/dashboards.types';
import { useAccounts } from '@/lib/query/hooks/useAccounts';

/** The content shape: a single figure, a chart, rows, or a built-in's own component. */
export type WidgetVisualKind = 'kpi' | 'chart' | 'table' | 'component';

function builtinKeyOf(widget: WidgetResponse): string | null {
  return widget.builtinKey ?? widget.builtin?.key ?? null;
}

export function widgetVisualKind(widget: WidgetResponse): WidgetVisualKind {
  if (isBuiltinWidget(widget) && widget.builtin?.kind === 'component') return 'component';
  const type = isBuiltinWidget(widget) ? widget.builtin?.templateType : widget.report?.type;
  if (type === 'KPI') return 'kpi';
  if (type === 'CHART') return 'chart';
  return 'table';
}

const BUILTIN_ICONS: Record<string, LucideIcon> = {
  [BUILTIN_NET_WORTH]: Wallet,
  [BUILTIN_ATTENTION]: Inbox,
  [BUILTIN_UPCOMING]: CalendarClock,
  [BUILTIN_BILLS_DUE]: CreditCard,
};

const KIND_ICONS: Record<WidgetVisualKind, LucideIcon> = {
  kpi: Gauge,
  chart: BarChart3,
  table: Table2,
  component: LayoutGrid,
};

/** A built-in's own icon (wallet for net worth, inbox, calendar, card), else one for its content shape. */
export function widgetIcon(widget: WidgetResponse): LucideIcon {
  const key = isBuiltinWidget(widget) ? builtinKeyOf(widget) : null;
  return (key && BUILTIN_ICONS[key]) || KIND_ICONS[widgetVisualKind(widget)];
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

/** A built-in's one-line subtitle when it needs no lookup (the catalog description is too long). */
function staticBuiltinSubtitle(widget: WidgetResponse): string | null {
  switch (builtinKeyOf(widget)) {
    case BUILTIN_NET_WORTH:
      return 'All accounts';
    case BUILTIN_ATTENTION:
      return 'Most urgent first';
    case BUILTIN_UPCOMING: {
      const days = widgetParams(widget).days;
      return typeof days === 'number' ? `Next ${days} ${days === 1 ? 'day' : 'days'}` : null;
    }
    case BUILTIN_BILLS_DUE:
      return 'All cards';
    default:
      return null;
  }
}

const subtitleClass = 'truncate text-2xs leading-4 text-slate-500 dark:text-slate-400';

function CardNameSubtitle({ accountId }: { accountId: string }) {
  const { data: accounts } = useAccounts();
  const name = accounts?.find((a) => a.id === accountId)?.name ?? 'One card';
  return <p className={subtitleClass}>{name}</p>;
}

/** The muted line under a widget's title; nothing for saved reports (their ref carries no datasource). */
export function WidgetSubtitle({ widget }: { widget: WidgetResponse }) {
  if (!isBuiltinWidget(widget)) return null;
  const accountId = widgetParams(widget).accountId;
  if (builtinKeyOf(widget) === BUILTIN_BILLS_DUE && typeof accountId === 'string') {
    return <CardNameSubtitle accountId={accountId} />;
  }
  const text = staticBuiltinSubtitle(widget);
  return text ? <p className={subtitleClass}>{text}</p> : null;
}
