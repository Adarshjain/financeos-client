'use client';

// A section header on a dashboard: static text spanning the full grid width.
// View mode: the title with a hairline running to the right edge, and an
// optional muted description under it. Edit mode: a dashed bar that is the
// grid drag handle, with inline title and description inputs and a remove
// button. No width toggle and no resize: a header is always full width and its
// height follows from whether it has a description (see `textWidgetHeight`).

import { GripVertical, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TEXT_DESCRIPTION_MAX, TEXT_TITLE_MAX, textDescription } from '@/lib/dashboards.helpers';
import type { WidgetResponse } from '@/lib/dashboards.types';

import { chipClass, stopDrag } from './DashboardWidgetHeader';

interface DashboardTextWidgetProps {
  widget: WidgetResponse;
  editing?: boolean;
  onChange?: (change: { title?: string; description?: string }) => void;
  onRemove?: () => void;
}

export function DashboardTextWidget({ widget, editing = false, onChange, onRemove }: DashboardTextWidgetProps) {
  const title = widget.title ?? '';
  const description = textDescription(widget);

  if (editing) {
    return (
      <div
        className="dashboard-drag-handle flex h-full cursor-move items-center gap-1.5 rounded-xl border border-dashed border-emerald-500/50 bg-slate-50/70 px-3 dark:bg-slate-800/40"
        data-testid="dashboard-header-edit"
      >
        <span className={`${chipClass} cursor-grab active:cursor-grabbing`} aria-hidden="true">
          <GripVertical className="h-4 w-4" />
        </span>
        <Input
          className="h-8 min-w-0 flex-1 border-0 bg-transparent px-1.5 text-base font-semibold text-slate-900 shadow-none focus-visible:ring-0 dark:text-slate-100"
          placeholder="Section title"
          aria-label="Header title"
          maxLength={TEXT_TITLE_MAX}
          // A new header arrives untitled: put the cursor in it.
          autoFocus={!title}
          value={title}
          onChange={(e) => onChange?.({ title: e.currentTarget.value })}
          onMouseDown={stopDrag}
          onTouchStart={stopDrag}
        />
        <Input
          className="h-8 min-w-0 flex-1 border-0 bg-transparent px-1.5 text-sm text-slate-500 shadow-none focus-visible:ring-0 dark:text-slate-400"
          placeholder="Description (optional)"
          aria-label="Header description"
          maxLength={TEXT_DESCRIPTION_MAX}
          value={description}
          onChange={(e) => onChange?.({ description: e.currentTarget.value })}
          onMouseDown={stopDrag}
          onTouchStart={stopDrag}
        />
        <Button
          type="button"
          variant="ghost-destructive"
          size="icon-xs"
          className="shrink-0"
          onClick={onRemove}
          onMouseDown={stopDrag}
          onTouchStart={stopDrag}
          title="Remove header"
          aria-label="Remove header"
        >
          <Trash2 />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-col justify-end px-1 pt-3" data-testid="dashboard-header">
      <div className="flex items-center gap-3">
        <h2
          className="min-w-0 truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100"
          title={title}
        >
          {title}
        </h2>
        <div className="h-px min-w-6 flex-1 bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
      </div>
      {description && (
        <p className="truncate text-sm text-slate-500 dark:text-slate-400" title={description}>
          {description}
        </p>
      )}
    </div>
  );
}
