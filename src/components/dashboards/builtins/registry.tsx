'use client';

// The client side of every built-in dashboard widget, keyed by builtinKey: its
// header icon, its body (component built-ins), its slot in the phone stack, a
// param-aware subtitle, and the hook-in point for a custom params editor.
//
// Template built-ins render like a saved report, by their templateType, unless
// the server names a custom `view` for them (e.g. a progress list over a TABLE
// template): `templateViewOf` maps that name to a renderer registered in
// TEMPLATE_VIEWS. An unknown or absent view falls back to the templateType
// rendering, so the server can ship a view before the client knows it.
//
// A component built-in whose key is not registered here renders the
// "no longer available" placeholder.

import {
  Briefcase,
  CalendarClock,
  CalendarDays,
  CreditCard,
  Gauge,
  Gift,
  HandCoins,
  Hourglass,
  Inbox,
  Landmark,
  LayoutGrid,
  LineChart,
  type LucideIcon,
  PieChart,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
} from 'lucide-react';
import { type ComponentType, createElement, type ReactElement } from 'react';

import { BillsDueWidget } from '@/components/bills/BillsDueWidget';
import { InboxWidget } from '@/components/inbox/InboxWidget';
import {
  BUILTIN_ATTENTION,
  BUILTIN_BILLS_DUE,
  BUILTIN_NET_WORTH,
  BUILTIN_UPCOMING,
  widgetParams,
} from '@/lib/dashboards.helpers';
import type { BuiltinWidgetResponse, WidgetParams, WidgetResponse } from '@/lib/dashboards.types';
import type { ReportData, SortClause } from '@/lib/reports.types';

import { CardNameSubtitle } from './BuiltinSubtitle';
import { CARDS_SPENDING_ENTRIES, CARDS_SPENDING_VIEWS } from './group.cardsSpending';
import { INVESTMENTS_LOANS_ENTRIES, INVESTMENTS_LOANS_VIEWS } from './group.investmentsLoans';
import type { GroupEntries } from './group.types';

/** What a component built-in's body receives. */
export interface BuiltinBodyProps {
  widget: WidgetResponse;
  /** The widget's params, normalized (null/absent dropped). */
  params: WidgetParams;
  className?: string;
}

/** What a custom template view receives: the loaded data plus the same runtime controls as a report. */
export interface TemplateViewProps {
  widget: WidgetResponse;
  data: ReportData;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
  sort?: SortClause | null;
  onSortChange?: (sort: SortClause | null) => void;
  onKpiValueClick?: () => void;
}

/** A custom params editor (Add widget / Widget settings) replacing the generic one. */
export interface BuiltinParamsEditorProps {
  def: BuiltinWidgetResponse;
  value: WidgetParams;
  onChange: (params: WidgetParams) => void;
}

/**
 * The widget's slot in the phone stack: `content` sizes to the content (capped
 * with internal scroll), `fill` gets a fixed-height slot of the given class.
 */
export type PhoneSlot = { fit: 'content' } | { fit: 'fill'; className: string };

export interface BuiltinRegistryEntry {
  /** Header chip icon. */
  icon: LucideIcon;
  /** Component built-ins: the body. Template built-ins leave it unset. */
  Body?: ComponentType<BuiltinBodyProps>;
  /** Phone stack slot; unset = by content shape (KPI 140px, chart/table 320px, component content-sized). */
  phone?: PhoneSlot;
  /**
   * A param-aware subtitle (a picked card's name, "Next 14 days"). It wins
   * over the server's static `subtitle`; null defers to it.
   */
  subtitle?: (widget: WidgetResponse) => string | ReactElement | null;
  /** Hook-in point for a custom params editor; unset = the generic params step. */
  ParamsEditor?: ComponentType<BuiltinParamsEditorProps>;
}

function BillsDueBody({ params, className }: BuiltinBodyProps) {
  const accountId = params.accountId;
  return <BillsDueWidget accountId={typeof accountId === 'string' ? accountId : null} className={className} />;
}

function InboxBody({ className }: BuiltinBodyProps) {
  return <InboxWidget className={className} />;
}

const CONTENT: PhoneSlot = { fit: 'content' };

/** Icons of the widget-expansion built-ins; each group module adds its bodies, views and subtitles on top. */
const GROUP_ICONS: Readonly<Record<string, LucideIcon>> = {
  card_utilisation: Gauge,
  milestone_progress: Trophy,
  cap_headroom: Hourglass,
  portfolio_snapshot: Briefcase,
  top_movers: TrendingUp,
  allocation: PieChart,
  tax_harvest: Receipt,
  spend_heatmap: CalendarDays,
  loan_payoff: Landmark,
  lending_balances: HandCoins,
  account_tile: LineChart,
  emergency_fund: ShieldCheck,
  rewards_earned: Gift,
  shortcuts: Zap,
};

function withGroups(): Record<string, BuiltinRegistryEntry> {
  const groups: GroupEntries = { ...CARDS_SPENDING_ENTRIES, ...INVESTMENTS_LOANS_ENTRIES };
  return Object.fromEntries(
    Object.entries(GROUP_ICONS).map(([key, icon]) => [key, { icon, ...groups[key] }]),
  );
}

export const BUILTIN_REGISTRY: Readonly<Record<string, BuiltinRegistryEntry>> = {
  [BUILTIN_NET_WORTH]: {
    icon: Wallet,
    subtitle: () => 'All accounts',
  },
  [BUILTIN_ATTENTION]: {
    icon: Inbox,
    Body: InboxBody,
    phone: CONTENT,
    subtitle: () => 'Most urgent first',
  },
  [BUILTIN_UPCOMING]: {
    icon: CalendarClock,
    subtitle: (widget) => {
      const days = widgetParams(widget).days;
      return typeof days === 'number' ? `Next ${days} ${days === 1 ? 'day' : 'days'}` : null;
    },
  },
  [BUILTIN_BILLS_DUE]: {
    icon: CreditCard,
    Body: BillsDueBody,
    phone: CONTENT,
    subtitle: (widget) => {
      const accountId = widgetParams(widget).accountId;
      return typeof accountId === 'string' ? createElement(CardNameSubtitle, { accountId }) : 'All cards';
    },
  },
  ...withGroups(),
};

/** Custom renderers for template built-ins, keyed by the server's `view` name (each group registers its own). */
export const TEMPLATE_VIEWS: Readonly<Record<string, ComponentType<TemplateViewProps>>> = {
  ...CARDS_SPENDING_VIEWS,
  ...INVESTMENTS_LOANS_VIEWS,
};

/** A widget's built-in key (the ref's key when the top-level one is absent). */
export function builtinKeyOf(widget: Pick<WidgetResponse, 'builtinKey' | 'builtin'>): string | null {
  return widget.builtinKey ?? widget.builtin?.key ?? null;
}

/** The registry entry for a key, or null when the client has none. */
export function builtinEntry(key: string | null | undefined): BuiltinRegistryEntry | null {
  if (!key || !Object.hasOwn(BUILTIN_REGISTRY, key)) return null;
  return BUILTIN_REGISTRY[key];
}

/** A built-in's icon by key (the picker's cards); a generic grid icon for a key the client does not know. */
export function builtinIcon(key: string | null | undefined): LucideIcon {
  return builtinEntry(key)?.icon ?? LayoutGrid;
}

/** A built-in widget's entry; null for a report widget or an unknown key. */
export function builtinEntryOf(widget: WidgetResponse): BuiltinRegistryEntry | null {
  return widget.kind === 'builtin' ? builtinEntry(builtinKeyOf(widget)) : null;
}

/** The server's `view` name for a template built-in, if any. */
export function builtinViewName(widget: WidgetResponse): string | null {
  return widget.kind === 'builtin' ? widget.builtin?.view || null : null;
}

/** The renderer for a view name; null when absent or unknown (render by templateType). */
export function templateView(view: string | null | undefined): ComponentType<TemplateViewProps> | null {
  if (!view || !Object.hasOwn(TEMPLATE_VIEWS, view)) return null;
  return TEMPLATE_VIEWS[view];
}

/** A template built-in's custom renderer, or null to render by templateType. */
export function templateViewOf(widget: WidgetResponse): ComponentType<TemplateViewProps> | null {
  if (widget.kind !== 'builtin' || widget.builtin?.kind !== 'template') return null;
  return templateView(builtinViewName(widget));
}

/** The server's static subtitle for a built-in, if it sends one. */
export function serverSubtitle(widget: WidgetResponse): string | null {
  return widget.kind === 'builtin' ? widget.builtin?.subtitle || null : null;
}

/** The custom params editor for a built-in, or null for the generic one. */
export function builtinParamsEditor(key: string | null | undefined): ComponentType<BuiltinParamsEditorProps> | null {
  return builtinEntry(key)?.ParamsEditor ?? null;
}
