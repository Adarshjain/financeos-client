// The two header chromes of a dashboard widget card. View mode: a neutral icon
// chip saying what the widget is, a sentence-case title with an optional muted
// subtitle, an explicit "Open" drill-through when the widget has a
// destination, and one always-visible overflow menu. Edit mode: the same row
// shape, with the grid drag handle in the chip's slot, a title-override input,
// and the width toggle / remove controls.

import { ChevronRight, ChevronsRightLeft, GripVertical, Pencil, SeparatorVertical, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isBuiltinWidget, widgetTitle } from '@/lib/dashboards.helpers';
import type { WidgetParams, WidgetResponse } from '@/lib/dashboards.types';

import { nextWidth, widthToggleLabel } from './editor/dashboardEditor.helpers';
import { WidgetActionsMenu } from './WidgetActionsMenu';
import { widgetHref, WidgetIcon, WidgetSubtitle } from './widgetMeta';

// Keep header controls from starting a grid drag/resize.
function stopDrag(e: React.MouseEvent | React.TouchEvent) {
  e.stopPropagation();
}

const chipClass =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';

interface WidgetViewHeaderProps {
  widget: WidgetResponse;
  available: boolean;
  onExpand: () => void;
  /** KPI widgets with their value loaded: the menu's "View underlying data". */
  onViewUnderlying?: () => void;
  /** Built-ins: saves new params from the menu's "Widget settings". */
  onParamsChange?: (params: WidgetParams) => Promise<void>;
}

export function WidgetViewHeader({
  widget,
  available,
  onExpand,
  onViewUnderlying,
  onParamsChange,
}: WidgetViewHeaderProps) {
  const href = widgetHref(widget, available);
  const title = widgetTitle(widget);
  return (
    <div className="flex shrink-0 items-center gap-2.5 px-3 pb-2 pt-3">
      <span className={chipClass} aria-hidden="true">
        <WidgetIcon widget={widget} className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold leading-5 text-slate-900 dark:text-slate-100" title={title}>
          {title}
        </h3>
        {available && <WidgetSubtitle widget={widget} />}
      </div>
      {href && (
        <Button asChild variant="ghost" size="micro" className="shrink-0">
          <Link href={href} aria-label={`Open ${title}`}>
            Open
            <ChevronRight className="text-slate-400" />
          </Link>
        </Button>
      )}
      {available && (
        <WidgetActionsMenu
          widget={widget}
          onExpand={onExpand}
          onViewUnderlying={onViewUnderlying}
          onParamsChange={onParamsChange}
        />
      )}
    </div>
  );
}

interface WidgetEditHeaderProps {
  widget: WidgetResponse;
  available: boolean;
  onTitleChange?: (title: string | null) => void;
  onRemove?: () => void;
  onToggleWidth?: () => void;
}

/** Edit-mode chrome: drag-handle header, title-override input, edit-report link, width toggle, remove. */
export function WidgetEditHeader({
  widget,
  available,
  onTitleChange,
  onRemove,
  onToggleWidth,
}: WidgetEditHeaderProps) {
  const reportId = available && !isBuiltinWidget(widget) ? (widget.reportId ?? null) : null;
  // The toggle cycles ¼ → ½ → full (see widthStops); its label names the next stop.
  const next = nextWidth(widget);
  const widthTitle = widthToggleLabel(widget);
  const collapses = next != null && next < widget.layout.w;
  return (
    <div className="dashboard-drag-handle flex shrink-0 cursor-move items-center gap-1.5 border-b border-slate-100 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
      <span className={`${chipClass} cursor-grab active:cursor-grabbing`} aria-hidden="true">
        <GripVertical className="h-4 w-4" />
      </span>
      <Input
        className="h-8 min-w-0 flex-1 border-0 bg-transparent px-1.5 text-sm font-semibold text-slate-900 shadow-none focus-visible:ring-0 dark:text-slate-100"
        placeholder={widget.builtin?.label ?? widget.report?.name ?? 'Widget'}
        aria-label="Widget title"
        value={widget.title ?? ''}
        onChange={(e) => onTitleChange?.(e.currentTarget.value || null)}
        onMouseDown={stopDrag}
        onTouchStart={stopDrag}
      />
      {reportId && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="shrink-0"
          asChild
          title="Edit report"
          aria-label="Edit report"
          onMouseDown={stopDrag}
          onTouchStart={stopDrag}
        >
          <Link href={`/reports/${reportId}`}>
            <Pencil className="text-slate-500" />
          </Link>
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="shrink-0"
        onClick={onToggleWidth}
        onMouseDown={stopDrag}
        onTouchStart={stopDrag}
        disabled={next == null}
        title={widthTitle}
        aria-label={widthTitle}
      >
        {collapses ? (
          <ChevronsRightLeft className="text-slate-500" />
        ) : (
          <SeparatorVertical className="text-slate-500" />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost-destructive"
        size="icon-xs"
        className="shrink-0"
        onClick={onRemove}
        onMouseDown={stopDrag}
        onTouchStart={stopDrag}
        title="Remove widget"
        aria-label="Remove widget"
      >
        <Trash2 />
      </Button>
    </div>
  );
}
