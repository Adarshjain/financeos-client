'use client';

import React, { forwardRef, useCallback, useLayoutEffect, useRef, useState } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import { ListRow } from '../ListRow/ListRow';
import { Text } from '../Text/Text';
import { useControllableState } from '../useControllableState';

export interface ReorderListItem {
  id: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Shown before the move buttons, e.g. a remove button */
  trailing?: React.ReactNode;
  /** Names the item in the move buttons' labels when `title` is not plain text */
  ariaLabel?: string;
}

export interface ReorderListProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  items: ReorderListItem[];
  /** Item ids in order (controlled). Items not listed follow in the order given. */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (ids: string[]) => void;
  /** Move button label prefixes; the item's name follows */
  labels?: { moveUp?: string; moveDown?: string };
}

type Dir = 'up' | 'down';

function orderItems(items: ReorderListItem[], ids: string[] | undefined): ReorderListItem[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const seen = new Set<string>();
  const out: ReorderListItem[] = [];
  for (const id of ids ?? []) {
    const item = byId.get(id);
    if (item && !seen.has(id)) {
      seen.add(id);
      out.push(item);
    }
  }
  for (const item of items) if (!seen.has(item.id)) out.push(item);
  return out;
}

export const ReorderList = forwardRef<HTMLDivElement, ReorderListProps>(
  ({ items, value, defaultValue, onValueChange, labels, className, ...props }, ref) => {
    const [ids, setIds] = useControllableState<string[]>({
      value,
      defaultValue,
      onChange: onValueChange,
    });
    const ordered = orderItems(items, ids);
    const orderKey = ordered.map((i) => i.id).join('\u0000');

    const rootRef = useRef<HTMLDivElement | null>(null);
    const rowRefs = useRef(new Map<string, HTMLDivElement>());
    const prevTops = useRef<Map<string, number> | null>(null);
    const pending = useRef<{ id: string; dir: Dir; key: string } | null>(null);
    // The moved row and the order its move produced; it stays highlighted only while that order holds.
    const [moved, setMoved] = useState<{ id: string; key: string } | null>(null);

    const setRoot = useCallback(
      (node: HTMLDivElement | null) => {
        rootRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      },
      [ref],
    );

    useLayoutEffect(() => {
      const before = prevTops.current;
      const target = pending.current;
      prevTops.current = null;
      pending.current = null;
      if (!before || !target) return;
      // The order changed some other way (the parent ignored the move, then changed value): no slide, no focus.
      if (target.key !== orderKey) return;

      rowRefs.current.forEach((el, id) => {
        const from = before.get(id);
        if (from === undefined) return;
        const delta = from - el.getBoundingClientRect().top;
        if (!delta) return;
        el.style.transition = 'none';
        el.style.transform = `translateY(${delta}px)`;
        void el.offsetHeight;
        el.style.transition = '';
        el.style.transform = '';
      });

      const row = rowRefs.current.get(target.id);
      if (!row) return;
      if (typeof row.scrollIntoView === 'function') row.scrollIntoView({ block: 'nearest' });
      const pick = (dir: Dir) =>
        row.querySelector<HTMLButtonElement>(`[data-reorder-move="${dir}"]`);
      const preferred = pick(target.dir);
      const other = pick(target.dir === 'up' ? 'down' : 'up');
      (preferred && !preferred.disabled ? preferred : other)?.focus();
    }, [orderKey]);

    const move = (id: string, dir: Dir) => {
      const index = ordered.findIndex((i) => i.id === id);
      const to = dir === 'up' ? index - 1 : index + 1;
      if (index < 0 || to < 0 || to >= ordered.length) return;
      const tops = new Map<string, number>();
      rowRefs.current.forEach((el, key) => tops.set(key, el.getBoundingClientRect().top));
      const next = ordered.map((i) => i.id);
      [next[index], next[to]] = [next[to], next[index]];
      prevTops.current = tops;
      pending.current = { id, dir, key: next.join('\u0000') };
      setMoved({ id, key: pending.current.key });
      setIds(next);
    };

    const moveUp = labels?.moveUp ?? 'Move up';
    const moveDown = labels?.moveDown ?? 'Move down';

    return (
      <div ref={setRoot} className={className} {...props}>
        {ordered.map((item, idx) => {
          const name = item.ariaLabel ?? (typeof item.title === 'string' ? item.title : '');
          return (
            <ListRow
              key={item.id}
              ref={(el) => {
                if (el) rowRefs.current.set(item.id, el);
                else rowRefs.current.delete(item.id);
              }}
              className={cn('transition-transform duration-base motion-reduce:transition-none')}
              highlighted={moved?.id === item.id && moved.key === orderKey}
              leading={
                <Text variant="label" tone="ink-3" mono>
                  {idx + 1}
                </Text>
              }
              title={item.title}
              subtitle={item.subtitle}
              trailing={
                <>
                  {item.trailing}
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    data-reorder-move="up"
                    aria-label={`${moveUp} ${name}`.trim()}
                    disabled={idx === 0}
                    onClick={() => move(item.id, 'up')}
                  >
                    <Icon name="chevron-up" size="sm" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    data-reorder-move="down"
                    aria-label={`${moveDown} ${name}`.trim()}
                    disabled={idx === ordered.length - 1}
                    onClick={() => move(item.id, 'down')}
                  >
                    <Icon name="chevron-down" size="sm" />
                  </Button>
                </>
              }
            />
          );
        })}
      </div>
    );
  },
);

ReorderList.displayName = 'ReorderList';
