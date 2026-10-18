'use client';

import { Command } from 'cmdk';
import React, { forwardRef, useEffect, useState } from 'react';

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
    const firstId = visible[0]?.items.find((it) => !it.disabled)?.id ?? '';
    const [active, setActive] = useState(firstId);
    useEffect(() => setActive(firstId), [firstId, query]);

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

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          ref={ref}
          size="md"
          srTitle={srTitle}
          showClose={false}
          className="lg:mb-auto lg:mt-space-40"
        >
          <Command shouldFilter={false} loop value={active} onValueChange={setActive} className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center gap-space-8 border-b border-line-soft px-space-16 pb-space-12 lg:pt-space-12">
              <TextField
                type="search"
                variant="embedded"
                autoFocus
                aria-label={srTitle}
                placeholder={placeholder}
                value={query}
                onValueChange={setQuery}
                prefix={<Icon name="search" />}
                suffix={<Kbd className="hidden lg:inline-flex">esc</Kbd>}
              />
              <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setOpen(false)}>
                {cancelLabel}
              </Button>
            </div>

            <DialogBody className="gap-0 p-space-6">
              <Command.List>
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
                    <Command.Group
                      key={group.id}
                      heading={
                        <SectionHeader borderTop={false} meta={group.meta}>
                          {group.label}
                        </SectionHeader>
                      }
                    >
                      {group.items.map((item) => (
                        <Command.Item
                          key={item.id}
                          asChild
                          value={item.id}
                          disabled={item.disabled}
                          onSelect={() => pick(item)}
                        >
                          <ListRow
                            clickable
                            borderTop={false}
                            highlighted={item.id === active}
                            disabled={item.disabled}
                            leading={<span className="flex w-space-20 justify-center text-ink-3">{item.leading}</span>}
                            trailing={item.trailing}
                          >
                            <span className="min-w-0 flex-1 truncate text-body text-ink">{item.title}</span>
                          </ListRow>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  ))
                )}
              </Command.List>
            </DialogBody>

            <DialogFooter className="hidden lg:block">
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
          </Command>
        </DialogContent>
      </Dialog>
    );
  },
);

SearchPalette.displayName = 'SearchPalette';
