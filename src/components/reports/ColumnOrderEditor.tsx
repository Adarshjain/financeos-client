'use client';

// Drag-to-reorder list for the selected raw-table columns. The array order of
// columns IS the column order on the wire (TableDefinitionRaw.columns), so this
// lets the user reorder them after picking. Uses native HTML5 drag-and-drop —
// the whole row is draggable, with a grip handle as the affordance. Adding /
// removing columns stays with the MultiSelect; this only reorders.

import { GripVertical } from 'lucide-react';
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

  const moveTo = (target: number) => {
    if (dragIndex === null || dragIndex === target) return;
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(target, 0, moved);
    onReorder(next.map((i) => i.key));
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
          <GripVertical className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate text-slate-700 dark:text-slate-200">
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
