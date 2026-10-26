'use client';

import React, { forwardRef, useEffect, useRef, useState } from 'react';

import { Button } from '../Button/Button';
import { Dialog, DialogBody, DialogContent, DialogFooter } from '../Dialog/Dialog';
import { Icon } from '../Icon/Icon';
import { Kbd } from '../Kbd/Kbd';
import { ListRow } from '../ListRow/ListRow';
import { SectionHeader } from '../SectionHeader/SectionHeader';
import { Skeleton } from '../Skeleton/Skeleton';
import { Text } from '../Text/Text';
import { TextField } from '../TextField/TextField';
import { useControllableState } from '../useControllableState';

export interface SearchPaletteItem {
  id: string;
  /** Row text; pass a Text body-strong span to bold a name inside it. */
  title: React.ReactNode;
  /** Mark in the fixed leading column (usually an Icon). */
  leading?: React.ReactNode;
  /** Right side: count, amount or Kbd shortcut. */
  trailing?: React.ReactNode;
  disabled?: boolean;
  onSelect: () => void;
}

export interface SearchPaletteGroup {
  id: string;
  label: React.ReactNode;
  /** Extra words after the label, e.g. "8 on Regalia". */
  meta?: React.ReactNode;
  items: SearchPaletteItem[];
}

export interface SearchPaletteProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The search text. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Results, in the order to show them. The page searches; the palette never filters. */
  groups: SearchPaletteGroup[];
  /** Results are being fetched: skeleton rows replace the list. */
  loading?: boolean;
  /** ⌘ / Ctrl + this key toggles the palette from anywhere on the page. */
  shortcutKey?: string;
  placeholder?: string;
  /** A muted line above the results (a nudge from the app), shown whatever the results are. */
  hint?: React.ReactNode;
  /** Shown when there is search text and no results. Default: No results for "xyz". */
  emptyLabel?: (query: string) => React.ReactNode;
  cancelLabel?: React.ReactNode;
  moveLabel?: React.ReactNode;
  openLabel?: React.ReactNode;
  /** Screen-reader dialog title. */
  srTitle?: string;
}

/**
 * SearchPalette: the ⌘K search over everything, as a Dialog (a sheet on phone).
 * Results arrive grouped from the page; arrow keys move, Enter or a click picks a row,
 * which runs its onSelect and closes the palette.
 */
export const SearchPalette = forwardRef<HTMLDivElement, SearchPaletteProps>(
  (
    {
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      value: valueProp,
      defaultValue = '',
      onValueChange,
      groups,
      hint,
      loading = false,
      shortcutKey,
      placeholder = 'Search…',
      emptyLabel = (query) => `No results for "${query}"`,
      cancelLabel = 'Cancel',
      moveLabel = 'move',
      openLabel = 'open',
      srTitle = 'Search',
    },
    ref,
  ) => {
    const [open, setOpen] = useControllableState<boolean>({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    });
    const [query, setQuery] = useControllableState<string>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    });

    const visible = groups.filter((g) => g.items.length > 0);
    const enabled = visible.flatMap((g) => g.items).filter((it) => !it.disabled);
    const firstId = enabled[0]?.id ?? '';
    const [active, setActive] = useState(firstId);
    useEffect(() => setActive(firstId), [firstId, query]);

    const listRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      listRef.current
        ?.querySelector(`[data-item-id="${CSS.escape(active)}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    }, [active]);

    useEffect(() => {
      if (!shortcutKey) return;
      const onKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === shortcutKey.toLowerCase()) {
          e.preventDefault();
          setOpen(!open);
        }
      };
      document.addEventListener('keydown', onKeyDown);
      return () => document.removeEventListener('keydown', onKeyDown);
    }, [shortcutKey, open, setOpen]);

    const pick = (item: SearchPaletteItem) => {
      item.onSelect();
      setOpen(false);
    };

    // ↑ / ↓ move the highlight over enabled rows (wrapping); Enter opens it. Focus stays in the field.
    const onKeyDown = (e: React.KeyboardEvent) => {
      if (loading || enabled.length === 0) return;
      const at = enabled.findIndex((it) => it.id === active);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        setActive(enabled[(at + step + enabled.length) % enabled.length].id);
      } else if (e.key === 'Enter' && at >= 0) {
        e.preventDefault();
        pick(enabled[at]);
      }
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          ref={ref}
          size="md"
          srTitle={srTitle}
          showClose={false}
          className="desk:mb-auto desk:mt-space-40"
        >
          <div onKeyDown={onKeyDown} className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center gap-space-8 border-b border-line-soft px-space-16 pb-space-12 desk:pt-space-12">
              <TextField
                type="search"
                variant="embedded"
                autoFocus
                aria-label={srTitle}
                placeholder={placeholder}
                value={query}
                onValueChange={setQuery}
                prefix={<Icon name="search" />}
                suffix={<Kbd className="hidden desk:inline-flex">esc</Kbd>}
              />
              <Button variant="ghost" size="sm" className="desk:hidden" onClick={() => setOpen(false)}>
                {cancelLabel}
              </Button>
            </div>

            <DialogBody className="gap-0 p-space-6">
              {hint && (
                <Text as="p" variant="caption" tone="ink-3" className="px-space-16 py-space-8">
                  {hint}
                </Text>
              )}
              <div ref={listRef} role="listbox">
                {loading ? (
                  <div data-loading="" className="flex flex-col gap-space-12 px-space-16 py-space-12">
                    {[60, 80, 45, 70].map((w) => (
                      <Skeleton key={w} width={`${w}%`} />
                    ))}
                  </div>
                ) : visible.length === 0 ? (
                  query.trim() && (
                    <Text as="p" tone="ink-3" align="center" className="py-space-24">
                      {emptyLabel(query.trim())}
                    </Text>
                  )
                ) : (
                  visible.map((group) => (
                    <div key={group.id} role="group">
                      <SectionHeader borderTop={false} meta={group.meta}>
                        {group.label}
                      </SectionHeader>
                      {group.items.map((item) => (
                        <ListRow
                          key={item.id}
                          role="option"
                          aria-selected={item.id === active}
                          data-item-id={item.id}
                          tabIndex={-1}
                          borderTop={false}
                          highlighted={item.id === active}
                          disabled={item.disabled}
                          onClick={() => pick(item)}
                          onMouseMove={() => setActive(item.id)}
                          leading={<span className="flex w-space-20 justify-center text-ink-3">{item.leading}</span>}
                          trailing={item.trailing}
                        >
                          <span className="min-w-0 flex-1 truncate text-body text-ink">{item.title}</span>
                        </ListRow>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </DialogBody>

            <DialogFooter className="hidden desk:block">
              <div className="flex items-center gap-space-16 text-caption text-ink-3">
                <span className="flex items-center gap-space-6">
                  <Kbd>
                    <Icon name="chevron-up" size="sm" />
                    <Icon name="chevron-down" size="sm" />
                  </Kbd>
                  {moveLabel}
                </span>
                <span className="flex items-center gap-space-6">
                  <Kbd>Enter</Kbd>
                  {openLabel}
                </span>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    );
  },
);

SearchPalette.displayName = 'SearchPalette';
