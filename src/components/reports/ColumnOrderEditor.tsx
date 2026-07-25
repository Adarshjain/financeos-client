'use client';

// Drag-to-reorder list for the selected raw-table columns. The array order of
// columns IS the column order on the wire (TableDefinitionRaw.columns), so this
// lets the user reorder them after picking. Uses native HTML5 drag-and-drop —
// the whole row is draggable, with a grip handle as the affordance. Adding /
// removing columns stays with the MultiSelect; this only reorders.

import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

export interface ColumnOrderItem {
  key: string;
  label: string;
}

interface ColumnOrderEditorProps {
  items: ColumnOrderItem[];
  /** Called with the full reordered list of keys. */
  onReorder: (keys: string[]) => void;
}

export function ColumnOrderEditor({ items, onReorder }: ColumnOrderEditorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  const reset = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next.map((i) => i.key));
  };

  const moveTo = (target: number) => {
    if (dragIndex === null) return;
    move(dragIndex, target);
  };

  return (
    <ul className="mt-2 space-y-1" aria-label="Column order">
      {items.map((item, index) => (
        <li
          key={item.key}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragEnter={() => setOverIndex(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            moveTo(index);
            reset();
          }}
          onDragEnd={reset}
          className={cn(
            'flex cursor-move items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900',
            dragIndex === index && 'opacity-50',
            overIndex === index &&
              dragIndex !== index &&
              'border-emerald-400 ring-1 ring-emerald-400'
          )}
        >
          <GripVertical className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="truncate text-slate-700 dark:text-slate-200">
            {item.label}
          </span>
          {/*
            Reordering was drag-only, so keyboard and screen-reader users could
            add and remove columns but never reorder them. These buttons give the
            same capability without needing pointer gestures.
          */}
          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => move(index, index - 1)}
              disabled={index === 0}
              aria-label={`Move ${item.label} up`}
              className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:hover:text-slate-200"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => move(index, index + 1)}
              disabled={index === items.length - 1}
              aria-label={`Move ${item.label} down`}
              className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:hover:text-slate-200"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
