'use client';

import React, { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import { useControllableState } from '../useControllableState';

export type WidgetGridWidth =
  | 'quarter'
  | 'third'
  | 'half'
  | 'two-thirds'
  | 'three-quarters'
  | 'full';

export interface WidgetGridLayoutItem {
  id: string;
  width: WidgetGridWidth;
}

export interface WidgetGridItem {
  id: string;
  /** Width used when the item is not in the layout yet */
  width: WidgetGridWidth;
  /** `false` hides the resize handle and keeps the width (e.g. a full-width section header) */
  resizable?: boolean;
  children: React.ReactNode;
  /** Controls shown top-right of the item while editing; they stay interactive */
  editActions?: React.ReactNode;
  /** Names the item in the drag and resize labels */
  label?: string;
  /** `true` keeps the item's content interactive while editing (e.g. a header's title field); default `false` */
  interactive?: boolean;
}

export interface WidgetGridProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  items: WidgetGridItem[];
  /** Order and width of each item (controlled). Items not listed follow in the order given. */
  layout?: WidgetGridLayoutItem[];
  defaultLayout?: WidgetGridLayoutItem[];
  onLayoutChange?: (layout: WidgetGridLayoutItem[]) => void;
  /** Shows the drag grip and resize handle on each item and makes item content inert */
  editing?: boolean;
  /** Spans the full width after the last item */
  footer?: React.ReactNode;
  dragLabel?: string;
  resizeLabel?: string;
}

/** Width steps from narrowest to widest. */
export const WIDGET_GRID_WIDTHS: readonly WidgetGridWidth[] = [
  'quarter',
  'third',
  'half',
  'two-thirds',
  'three-quarters',
  'full',
];

const SPANS: Record<WidgetGridWidth, number> = {
  quarter: 3,
  third: 4,
  half: 6,
  'two-thirds': 8,
  'three-quarters': 9,
  full: 12,
};

/** Columns (of 12) a width step spans on desktop. */
export function widgetGridSpan(width: WidgetGridWidth): number {
  return SPANS[width];
}

/** The step nearest to a share of the grid width (0 to 1). */
export function widgetGridWidthFromFraction(fraction: number): WidgetGridWidth {
  const share = fraction * 12;
  let best = WIDGET_GRID_WIDTHS[0];
  for (const w of WIDGET_GRID_WIDTHS) {
    if (Math.abs(SPANS[w] - share) < Math.abs(SPANS[best] - share)) best = w;
  }
  return best;
}

/** Maps a column count out of `total` (e.g. a server's 100-column width) to a step. */
export function widgetGridWidthFromColumns(columns: number, total = 100): WidgetGridWidth {
  return widgetGridWidthFromFraction(columns / total);
}

const DESK_SPAN_CLASS: Record<WidgetGridWidth, string> = {
  quarter: 'desk:col-span-3',
  third: 'desk:col-span-4',
  half: 'desk:col-span-6',
  'two-thirds': 'desk:col-span-8',
  'three-quarters': 'desk:col-span-9',
  full: 'desk:col-span-12',
};

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Index among the other items where a dragged item dropped at the pointer would sit. */
function insertionIndex(others: Rect[], x: number, y: number): number {
  for (let i = 0; i < others.length; i++) {
    const r = others[i];
    if (y < r.top) return i;
    if (y <= r.bottom && x < (r.left + r.right) / 2) return i;
  }
  return others.length;
}

const EDGE = 64;
const MAX_SCROLL = 24;

interface DragState {
  id: string;
  x: number;
  y: number;
  order: string[];
}

interface ResizeState {
  id: string;
  width: WidgetGridWidth;
}

export const WidgetGrid = forwardRef<HTMLDivElement, WidgetGridProps>(
  (
    {
      items,
      layout,
      defaultLayout,
      onLayoutChange,
      editing = false,
      footer,
      dragLabel = 'Drag to reorder',
      resizeLabel = 'Resize',
      className,
      ...props
    },
    ref,
  ) => {
    const [layoutState, setLayout] = useControllableState<WidgetGridLayoutItem[]>({
      value: layout,
      defaultValue: defaultLayout,
      onChange: onLayoutChange,
    });

    const byId = new Map(items.map((i) => [i.id, i]));
    const committed: WidgetGridLayoutItem[] = [];
    const seen = new Set<string>();
    for (const l of layoutState ?? []) {
      if (byId.has(l.id) && !seen.has(l.id)) {
        seen.add(l.id);
        committed.push({ id: l.id, width: l.width });
      }
    }
    for (const i of items) if (!seen.has(i.id)) committed.push({ id: i.id, width: i.width });

    const [drag, setDrag] = useState<DragState | null>(null);
    const [resize, setResize] = useState<ResizeState | null>(null);
    const dragRef = useRef<DragState | null>(null);
    const resizeRef = useRef<ResizeState | null>(null);
    const cleanupRef = useRef<(() => void) | null>(null);
    const gridRef = useRef<HTMLDivElement | null>(null);
    const itemEls = useRef(new Map<string, HTMLDivElement>());
    const committedRef = useRef(committed);
    useLayoutEffect(() => {
      committedRef.current = committed;
    });

    const setGrid = useCallback(
      (node: HTMLDivElement | null) => {
        gridRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      },
      [ref],
    );

    const showDrag = (next: DragState | null) => {
      dragRef.current = next;
      setDrag(next);
    };
    const showResize = (next: ResizeState | null) => {
      resizeRef.current = next;
      setResize(next);
    };

    const orderedIds = drag ? drag.order : committed.map((c) => c.id);
    const widthOf = (id: string): WidgetGridWidth =>
      resize && resize.id === id
        ? resize.width
        : (committed.find((c) => c.id === id)?.width ?? 'full');

    // The dragged item follows the pointer: offset it from the slot it currently sits in.
    const grab = useRef({ x: 0, y: 0 });
    useLayoutEffect(() => {
      if (!drag) return;
      const el = itemEls.current.get(drag.id);
      if (!el) return;
      el.style.transform = '';
      const r = el.getBoundingClientRect();
      let dx = drag.x - grab.current.x - r.left;
      // Keep the item inside the grid sideways: a transform widens the page's scrollable area.
      const g = gridRef.current?.getBoundingClientRect();
      if (g) dx = Math.min(Math.max(dx, g.left - r.left), g.right - r.right);
      el.style.transform = `translate(${dx}px, ${drag.y - grab.current.y - r.top}px)`;
    }, [drag]);

    useEffect(
      () => () => {
        cleanupRef.current?.();
      },
      [],
    );

    const clearTransform = (id: string) => {
      const el = itemEls.current.get(id);
      if (el) el.style.transform = '';
    };

    const updateDrag = (id: string, x: number, y: number) => {
      const others = (dragRef.current?.order ?? committedRef.current.map((c) => c.id)).filter(
        (k) => k !== id,
      );
      const rects = others.map((k) => {
        const r = itemEls.current.get(k)?.getBoundingClientRect();
        return {
          left: r?.left ?? 0,
          top: r?.top ?? 0,
          right: r?.right ?? 0,
          bottom: r?.bottom ?? 0,
        };
      });
      const at = insertionIndex(rects, x, y);
      const order = [...others.slice(0, at), id, ...others.slice(at)];
      showDrag({ id, x, y, order });
    };

    const startDrag = (e: React.PointerEvent<HTMLButtonElement>, id: string) => {
      if (e.button !== undefined && e.button > 0) return;
      const el = itemEls.current.get(id);
      if (!el) return;
      cleanupRef.current?.();
      const target = e.currentTarget;
      try {
        target.setPointerCapture?.(e.pointerId);
      } catch {
        // pointer already gone
      }
      const r = el.getBoundingClientRect();
      grab.current = { x: e.clientX - r.left, y: e.clientY - r.top };
      const pointer = { x: e.clientX, y: e.clientY };
      let raf = 0;

      const tick = () => {
        const h = document.documentElement.clientHeight;
        let dy = 0;
        if (pointer.y < EDGE) dy = -Math.ceil(((EDGE - pointer.y) / EDGE) * MAX_SCROLL);
        else if (pointer.y > h - EDGE) dy = Math.ceil(((pointer.y - (h - EDGE)) / EDGE) * MAX_SCROLL);
        if (dy) {
          window.scrollBy(0, dy);
          updateDrag(id, pointer.x, pointer.y);
        }
        raf = window.requestAnimationFrame(tick);
      };

      const finish = (commit: boolean) => {
        cleanupRef.current?.();
        cleanupRef.current = null;
        const state = dragRef.current;
        clearTransform(id);
        showDrag(null);
        try {
          target.releasePointerCapture?.(e.pointerId);
        } catch {
          // already released
        }
        if (commit && state) {
          const current = committedRef.current;
          const same = state.order.every((k, i) => current[i]?.id === k);
          if (!same) {
            const w = new Map(current.map((c) => [c.id, c.width]));
            setLayout(state.order.map((k) => ({ id: k, width: w.get(k) ?? 'full' })));
          }
        }
      };

      const onMove = (ev: PointerEvent) => {
        pointer.x = ev.clientX;
        pointer.y = ev.clientY;
        updateDrag(id, ev.clientX, ev.clientY);
      };
      const onUp = () => finish(true);
      const onCancel = () => finish(false);
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === 'Escape') finish(false);
      };
      target.addEventListener('pointermove', onMove);
      target.addEventListener('pointerup', onUp);
      target.addEventListener('pointercancel', onCancel);
      window.addEventListener('keydown', onKey);
      raf = window.requestAnimationFrame(tick);
      cleanupRef.current = () => {
        target.removeEventListener('pointermove', onMove);
        target.removeEventListener('pointerup', onUp);
        target.removeEventListener('pointercancel', onCancel);
        window.removeEventListener('keydown', onKey);
        window.cancelAnimationFrame(raf);
      };
      updateDrag(id, e.clientX, e.clientY);
    };

    const startResize = (e: React.PointerEvent<HTMLButtonElement>, id: string) => {
      if (e.button !== undefined && e.button > 0) return;
      const el = itemEls.current.get(id);
      const grid = gridRef.current;
      if (!el || !grid) return;
      cleanupRef.current?.();
      const target = e.currentTarget;
      try {
        target.setPointerCapture?.(e.pointerId);
      } catch {
        // pointer already gone
      }
      const startX = e.clientX;
      const startWidth = el.getBoundingClientRect().width;
      const startStep = committedRef.current.find((c) => c.id === id)?.width ?? 'full';
      showResize({ id, width: startStep });

      const finish = (commit: boolean) => {
        cleanupRef.current?.();
        cleanupRef.current = null;
        const state = resizeRef.current;
        showResize(null);
        try {
          target.releasePointerCapture?.(e.pointerId);
        } catch {
          // already released
        }
        if (commit && state && state.width !== startStep) {
          setLayout(
            committedRef.current.map((c) => (c.id === id ? { id, width: state.width } : c)),
          );
        }
      };
      const onMove = (ev: PointerEvent) => {
        const gridWidth = grid.getBoundingClientRect().width;
        if (!gridWidth) return;
        const next = widgetGridWidthFromFraction((startWidth + ev.clientX - startX) / gridWidth);
        if (resizeRef.current?.width !== next) showResize({ id, width: next });
      };
      const onUp = () => finish(true);
      const onCancel = () => finish(false);
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === 'Escape') finish(false);
      };
      target.addEventListener('pointermove', onMove);
      target.addEventListener('pointerup', onUp);
      target.addEventListener('pointercancel', onCancel);
      window.addEventListener('keydown', onKey);
      cleanupRef.current = () => {
        target.removeEventListener('pointermove', onMove);
        target.removeEventListener('pointerup', onUp);
        target.removeEventListener('pointercancel', onCancel);
        window.removeEventListener('keydown', onKey);
      };
    };

    return (
      <div
        ref={setGrid}
        data-editing={editing ? 'true' : undefined}
        className={cn(
          'grid min-w-0 max-w-full grid-cols-1 desk:grid-cols-12 grid-flow-row auto-rows-auto items-stretch gap-x-space-12 gap-y-space-8 desk:gap-space-16',
          className,
        )}
        {...props}
      >
        {orderedIds.map((id) => {
          const item = byId.get(id);
          if (!item) return null;
          const width = widthOf(id);
          const dragging = drag?.id === id;
          const name = item.label ? ` ${item.label}` : '';
          return (
            <div
              key={id}
              ref={(el) => {
                if (el) itemEls.current.set(id, el);
                else itemEls.current.delete(id);
              }}
              data-widget-grid-item={id}
              data-width={width}
              data-dragging={dragging ? 'true' : undefined}
              className={cn(
                // isolate: the item's own grip, handle and actions (z-floating) stack inside it, so they never draw over a dragged item.
                'relative isolate flex min-w-0 flex-col',
                DESK_SPAN_CLASS[width],
                // Opaque frame: a dragged item must not show the items it passes over.
                editing && 'rounded-ds-lg ring-1 ring-line-strong bg-surface',
                // Above the other items (which are z-auto), below the sticky bar and tab bar.
                dragging && 'z-sticky shadow-level-3',
              )}
            >
              <div className="grid min-w-0 flex-1 grid-cols-1" inert={editing && !item.interactive}>
                {item.children}
              </div>
              {editing && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    iconOnly
                    data-widget-grid-grip={id}
                    aria-label={`${dragLabel}${name}`}
                    className="absolute left-space-8 top-space-8 z-floating cursor-grab touch-none"
                    onPointerDown={(e) => startDrag(e, id)}
                  >
                    <Icon name="grip" size="sm" />
                  </Button>
                  {item.editActions && (
                    <div className="absolute right-space-8 top-space-8 z-floating flex items-center gap-space-4">
                      {item.editActions}
                    </div>
                  )}
                  {item.resizable !== false && (
                    <div className="absolute bottom-space-8 right-space-8 z-floating hidden desk:flex">
                      <Button
                        variant="secondary"
                        size="sm"
                        iconOnly
                        data-widget-grid-resize={id}
                        aria-label={`${resizeLabel}${name}`}
                        className="cursor-nwse-resize touch-none"
                        onPointerDown={(e) => startResize(e, id)}
                      >
                        <Icon name="resize-corner" size="sm" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
        {footer && <div className="col-span-full min-w-0">{footer}</div>}
      </div>
    );
  },
);

WidgetGrid.displayName = 'WidgetGrid';
