'use client';

// Edit-mode widget chrome: a drag handle (the header), an editable title
// override, a remove button, and a light summary. No data is fetched while
// editing — only the layout/title are manipulated.

import { GripVertical, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { WidgetResponse } from '@/lib/dashboards.types';

interface WidgetEditCardProps {
  widget: WidgetResponse;
  onTitleChange: (title: string | null) => void;
  onRemove: () => void;
}

export function WidgetEditCard({
  widget,
  onTitleChange,
  onRemove,
}: WidgetEditCardProps) {
  // Stop pointer events on interactive controls from starting a grid drag.
  const stop = (e: React.MouseEvent | React.TouchEvent) => e.stopPropagation();

  return (
    <Card className="flex h-full flex-col overflow-hidden ring-2 ring-emerald-500/20">
      <div className="dashboard-drag-handle flex cursor-move items-center gap-1 border-b border-slate-100 bg-slate-50 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-800/50">
        <GripVertical className="h-4 w-4 shrink-0 text-slate-400" />
        <Input
          className="h-7 border-0 bg-transparent px-1 text-sm font-medium shadow-none focus-visible:ring-0"
          placeholder={widget.report.name ?? 'Report'}
          value={widget.title ?? ''}
          onChange={(e) => onTitleChange(e.currentTarget.value || null)}
          onMouseDown={stop}
          onTouchStart={stop}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onRemove}
          onMouseDown={stop}
          onTouchStart={stop}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 p-3 text-center">
        <span className="max-w-full truncate text-sm font-medium text-slate-700 dark:text-slate-300">
          {widget.report.name ?? 'Unavailable report'}
        </span>
        {widget.report.type && (
          <Badge variant="secondary">{widget.report.type}</Badge>
        )}
        <span className="text-xs text-slate-400">
          Drag the header to move · drag a corner to resize
        </span>
      </div>
    </Card>
  );
}
