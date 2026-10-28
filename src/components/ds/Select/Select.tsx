'use client';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Badge } from '../Badge/Badge';
import { Button } from '../Button/Button';
import { Checkbox } from '../Checkbox/Checkbox';
import { cn } from '../cn';
import { FieldFrame } from '../FieldFrame';
import { Icon } from '../Icon/Icon';
import { getItemRowClass } from '../itemRow';
import { Popover } from '../Popover/Popover';
import { Radio } from '../Radio/Radio';
import { SectionHeader } from '../SectionHeader/SectionHeader';
import { TextField } from '../TextField/TextField';
import { useControllableState } from '../useControllableState';
import { fitChips } from './fitChips';

export interface SelectOption {
  value: string;
  label: string;
  searchText?: string;
  icon?: React.ReactNode;
  hint?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  disabledReason?: React.ReactNode;
  group?: string;
}

export interface SelectGroup {
  name: string;
  options: SelectOption[];
}

export interface SelectAction {
  label: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
}

export interface SelectMenuProps {
  id?: string;
  options?: SelectOption[];
  groups?: SelectGroup[];
  value?: string | string[];
  selected?: string | string[];
  multiple?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (query: string) => void;
  onSelect?: (value: string) => void;
  onSelectedChange?: (value: string) => void;
  onClear?: () => void;
  onDone?: () => void;
  /** Multiple only: when given, a Cancel action sits first, before Clear and Done */
  onDiscard?: () => void;
  onClose?: () => void;
  onCreate?: (query: string) => void;
  createLabel?: (query: string) => React.ReactNode;
  actions?: SelectAction[];
  clearLabel?: React.ReactNode;
  discardLabel?: React.ReactNode;
  doneLabel?: (count: number) => React.ReactNode;
  filter?: 'auto' | 'none' | ((option: SelectOption, query: string) => boolean);
  showRadio?: boolean;
  className?: string;
  emptyText?: (query: string) => React.ReactNode;
}

// A modal Dialog locks page scroll for everything outside it, and a popover is portalled outside it: keep wheel and touch scrolling inside the list.
const stopScrollLock = (e: React.SyntheticEvent) => e.stopPropagation();

export const SelectMenu = forwardRef<HTMLDivElement, SelectMenuProps>(
  (
    {
      id: explicitId,
      options = [],
      groups,
      value,
      selected,
      multiple = false,
      searchable = false,
      searchPlaceholder = 'Search…',
      searchValue: controlledSearch,
      onSearchChange,
      onSelect,
      onSelectedChange,
      onClear,
      onDone,
      onDiscard,
      onClose,
      onCreate,
      createLabel,
      actions,
      clearLabel = 'Clear',
      discardLabel = 'Cancel',
      doneLabel,
      filter = 'auto',
      showRadio = false,
      className,
      emptyText,
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = explicitId || generatedId;
    const listboxId = `${id}-listbox`;

    const effectiveValue = selected !== undefined ? selected : value;

    const [internalSearch, setInternalSearch] = useState('');
    const searchQuery =
      controlledSearch !== undefined ? controlledSearch : internalSearch;

    const handleSearchChange = (q: string) => {
      if (controlledSearch === undefined) {
        setInternalSearch(q);
      }
      onSearchChange?.(q);
    };

    const handleOptionSelect = (val: string) => {
      onSelect?.(val);
      onSelectedChange?.(val);
    };

    // Create is offered only for text that isn't already an option; afterwards the search clears for the next entry.
    const typed = searchQuery.trim();
    const canCreate =
      !!onCreate &&
      !!typed &&
      !(groups && groups.length > 0 ? groups.flatMap((g) => g.options) : options).some(
        (opt) => opt.label.toLowerCase() === typed.toLowerCase(),
      );
    const handleCreate = () => {
      onCreate?.(typed);
      handleSearchChange('');
    };

    const selectedValues = useMemo(() => {
      if (effectiveValue === undefined || effectiveValue === null) return new Set<string>();
      if (Array.isArray(effectiveValue)) return new Set(effectiveValue);
      return new Set([effectiveValue]);
    }, [effectiveValue]);

    // Flatten options if groups are used
    const processedGroups: SelectGroup[] = useMemo(() => {
      if (groups && groups.length > 0) {
        return groups;
      }
      const hasGroups = options.some((opt) => opt.group);
      if (hasGroups) {
        const groupMap = new Map<string, SelectOption[]>();
        for (const opt of options) {
          const gName = opt.group || '';
          if (!groupMap.has(gName)) {
            groupMap.set(gName, []);
          }
          groupMap.get(gName)!.push(opt);
        }
        return Array.from(groupMap.entries()).map(([name, gOptions]) => ({
          name,
          options: gOptions,
        }));
      }
      return [{ name: '', options }];
    }, [groups, options]);

    // Filter by search query
    const filteredGroups = useMemo(() => {
      if (filter === 'none') return processedGroups;
      if (!searchQuery.trim()) return processedGroups;
      const lower = searchQuery.toLowerCase();
      const filterFn =
        typeof filter === 'function'
          ? (opt: SelectOption) => filter(opt, searchQuery)
          : (opt: SelectOption) => {
              const matchesLabel = opt.label.toLowerCase().includes(lower);
              const matchesSearch = opt.searchText
                ? opt.searchText.toLowerCase().includes(lower)
                : false;
              return matchesLabel || matchesSearch;
            };

      return processedGroups
        .map((g) => ({
          name: g.name,
          options: g.options.filter(filterFn),
        }))
        .filter((g) => g.options.length > 0);
    }, [processedGroups, searchQuery, filter]);

    const totalMatches = useMemo(
      () => filteredGroups.reduce((acc, g) => acc + g.options.length, 0),
      [filteredGroups],
    );

    const flatEnabledOptions = useMemo(() => {
      return filteredGroups.flatMap((g) =>
        g.options.filter((opt) => !opt.disabled),
      );
    }, [filteredGroups]);

    const [highlightedValue, setHighlightedValue] = useState<string | null>(
      null,
    );

    const effectiveHighlighted = useMemo(() => {
      if (
        highlightedValue &&
        flatEnabledOptions.some((opt) => opt.value === highlightedValue)
      ) {
        return highlightedValue;
      }
      const firstSelected = Array.isArray(effectiveValue)
        ? effectiveValue[0]
        : effectiveValue;
      if (
        firstSelected &&
        typeof firstSelected === 'string' &&
        flatEnabledOptions.some((opt) => opt.value === firstSelected)
      ) {
        return firstSelected;
      }
      return flatEnabledOptions[0]?.value ?? null;
    }, [highlightedValue, flatEnabledOptions, effectiveValue]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (flatEnabledOptions.length === 0) return;
        const currentIndex = flatEnabledOptions.findIndex(
          (opt) => opt.value === effectiveHighlighted,
        );
        const nextIndex =
          currentIndex < flatEnabledOptions.length - 1 ? currentIndex + 1 : 0;
        setHighlightedValue(flatEnabledOptions[nextIndex].value);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (flatEnabledOptions.length === 0) return;
        const currentIndex = flatEnabledOptions.findIndex(
          (opt) => opt.value === effectiveHighlighted,
        );
        const prevIndex =
          currentIndex > 0 ? currentIndex - 1 : flatEnabledOptions.length - 1;
        setHighlightedValue(flatEnabledOptions[prevIndex].value);
      } else if (e.key === 'Home') {
        e.preventDefault();
        if (flatEnabledOptions.length > 0) {
          setHighlightedValue(flatEnabledOptions[0].value);
        }
      } else if (e.key === 'End') {
        e.preventDefault();
        if (flatEnabledOptions.length > 0) {
          setHighlightedValue(
            flatEnabledOptions[flatEnabledOptions.length - 1].value,
          );
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (effectiveHighlighted) {
          handleOptionSelect(effectiveHighlighted);
        } else if (canCreate) {
          handleCreate();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };

    const renderOption = (opt: SelectOption) => {
      const isSelected = selectedValues.has(opt.value);
      const isDisabled = Boolean(opt.disabled);
      const isHighlighted = opt.value === effectiveHighlighted;

      const rowClass = getItemRowClass({
        active: isSelected && !multiple && !showRadio,
        disabled: isDisabled,
      });

      return (
        <div
          key={opt.value}
          id={`${id}-opt-${opt.value}`}
          role="option"
          aria-selected={isSelected}
          aria-disabled={isDisabled}
          onMouseEnter={() => {
            if (!isDisabled) setHighlightedValue(opt.value);
          }}
          onClick={() => {
            if (!isDisabled) {
              handleOptionSelect(opt.value);
            }
          }}
          className={cn(
            rowClass,
            isHighlighted && !isDisabled && !isSelected && 'bg-hover',
          )}
        >
          {multiple ? (
            <Checkbox checked={isSelected} className="pointer-events-none shrink-0" />
          ) : null}

          {showRadio ? (
            <Radio checked={isSelected} tabIndex={-1} className="pointer-events-none shrink-0" />
          ) : null}

          {opt.icon ? (
            <span className={cn('shrink-0 flex items-center', isDisabled && 'opacity-60')}>{opt.icon}</span>
          ) : null}

          <div className="flex-1 min-w-0">
            <span
              className={cn(
                'block font-text font-medium text-body truncate',
                isDisabled
                  ? 'text-ink-faint'
                  : isSelected && !multiple && !showRadio
                    ? 'text-brand-strong'
                    : 'text-ink',
              )}
            >
              {opt.label}
            </span>
            {opt.description ? (
              <span className={cn('block font-text font-medium text-caption truncate', isDisabled ? 'text-ink-faint' : 'text-ink-3')}>
                {opt.description}
              </span>
            ) : null}
          </div>

          {opt.disabledReason ? (
            <span className={cn('ml-auto font-text font-medium text-caption', isDisabled ? 'text-ink-faint' : 'text-ink-4')}>
              {opt.disabledReason}
            </span>
          ) : opt.hint ? (
            <span className={cn('ml-auto font-text font-medium text-caption', isDisabled ? 'text-ink-faint' : 'text-ink-4')}>
              {opt.hint}
            </span>
          ) : isSelected && !multiple && !showRadio ? (
            <Icon name="check" size="md" className="ml-auto text-brand-strong shrink-0" />
          ) : null}
        </div>
      );
    };

    return (
      <div
        ref={ref}
        tabIndex={!searchable ? 0 : undefined}
        onKeyDown={!searchable ? handleKeyDown : undefined}
        className={cn(
          'flex flex-col w-full min-h-0 outline-none p-space-6',
          className,
        )}
      >
        {searchable ? (
          <div className="mb-space-8">
            <TextField
              type="search"
              size="md"
              variant="embedded"
              prefix={<Icon name="search" size="sm" />}
              clearable
              value={searchQuery}
              placeholder={searchPlaceholder}
              onValueChange={handleSearchChange}
              autoFocus
              onKeyDown={handleKeyDown}
            />
          </div>
        ) : null}

        <div
          role="listbox"
          id={listboxId}
          aria-multiselectable={multiple}
          aria-activedescendant={
            effectiveHighlighted
              ? `${id}-opt-${effectiveHighlighted}`
              : undefined
          }
          onWheel={stopScrollLock}
          onTouchMove={stopScrollLock}
          className="flex flex-col flex-1 min-h-0 overflow-y-auto max-h-72 outline-none touch-pan-y"
        >
          {totalMatches === 0 && searchQuery.trim() ? (
            <div className="px-space-10 py-space-14 font-text text-label font-medium text-ink-3 text-center">
              {emptyText ? emptyText(searchQuery) : 'No results'}
            </div>
          ) : null}

          {filteredGroups.map((g, gIdx) => (
            <React.Fragment key={g.name || gIdx}>
              {g.name ? (
                <SectionHeader variant="band" borderTop={false} className={gIdx > 0 ? 'mt-space-4' : undefined}>
                  {g.name}
                </SectionHeader>
              ) : null}
              {g.options.map((opt) => renderOption(opt))}
            </React.Fragment>
          ))}
        </div>

        {canCreate ? (
          <>
            <div className="h-px bg-line-soft my-space-4 mx-space-6" />
            <button
              type="button"
              onClick={handleCreate}
              className="flex items-center gap-space-8 py-space-8 px-space-10 rounded-ds-md font-text font-bold text-body text-brand hover:bg-hover cursor-pointer transition-colors w-full text-left"
            >
              {createLabel ? (
                createLabel(typed)
              ) : (
                <>
                  <Icon name="add" size="sm" />
                  <span>{typed}</span>
                </>
              )}
            </button>
          </>
        ) : null}

        {actions && actions.length > 0 ? (
          <>
            <div className="h-px bg-line-soft my-space-4 mx-space-6" />
            <div className="flex flex-col items-start gap-space-12 px-space-10 py-space-8 text-body text-ink">
              {actions.map((a, i) => (
                <Button
                  key={i}
                  type="button"
                  variant="link"
                  disabled={a.disabled}
                  onClick={() => {
                    onClose?.();
                    a.onSelect();
                  }}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          </>
        ) : null}

        {multiple ? (
          <div className="flex items-center justify-end gap-space-8 px-space-6 pt-space-8 pb-space-4 border-t border-line-soft mt-space-4 text-label">
            {onDiscard ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mr-auto"
                onClick={onDiscard}
              >
                {discardLabel}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
            >
              {clearLabel}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onDone}
            >
              {doneLabel ? doneLabel(selectedValues.size) : 'Done'}
            </Button>
          </div>
        ) : null}
      </div>
    );
  },
);

SelectMenu.displayName = 'SelectMenu';

export interface SelectProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'value' | 'defaultValue' | 'onChange' | 'placeholder'
  > {
  id?: string;
  name?: string;
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  placeholder?: string;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  options?: SelectOption[];
  groups?: SelectGroup[];
  multiple?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (query: string) => void;
  onCreate?: (query: string) => void;
  createLabel?: (query: string) => React.ReactNode;
  actions?: SelectAction[];
  clearLabel?: React.ReactNode;
  /** Multiple only: restores the value the field had when the popover opened, then closes */
  discardLabel?: React.ReactNode;
  doneLabel?: (count: number) => React.ReactNode;
  filter?: 'auto' | 'none' | ((option: SelectOption, query: string) => boolean);
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  trigger?: React.ReactNode;
  showRadio?: boolean;
  size?: 'sm' | 'md';
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  emptyText?: (query: string) => React.ReactNode;
}

// A chip's measured width is cached per value and label, so a renamed option is measured again.
// Read back from a `data-chip-key` attribute, so it must survive server HTML: a NUL there turns into U+FFFD on parse and the chip is never found again.
const chipKey = (opt: SelectOption) => JSON.stringify([opt.value, opt.label]);

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      id: explicitId,
      name,
      label,
      helper,
      error,
      placeholder,
      value: controlledValue,
      defaultValue,
      onValueChange,
      options = [],
      groups,
      multiple = false,
      searchable = false,
      searchPlaceholder,
      searchValue,
      onSearchChange,
      onCreate,
      createLabel,
      actions,
      clearLabel,
      discardLabel,
      doneLabel,
      filter,
      disabled = false,
      loading = false,
      loadingText = 'Loading…',
      icon: explicitIcon,
      trigger,
      showRadio = false,
      size = 'md',
      open: controlledOpen,
      defaultOpen = false,
      onOpenChange,
      className,
      triggerClassName,
      menuClassName,
      emptyText,
      ...restProps
    },
    ref,
  ) => {
    const isSm = size === 'sm';
    const generatedId = useId();
    const id = explicitId || generatedId;
    const helperId = `${id}-helper`;
    const labelId = `${id}-label`;
    const listboxId = `${id}-listbox`;

    const [currentValue, setCurrentValue] = useControllableState<
      string | string[]
    >({
      value: controlledValue,
      defaultValue:
        defaultValue !== undefined ? defaultValue : multiple ? [] : '',
      onChange: onValueChange,
    });

    const [isOpen, setOpen] = useControllableState<boolean>({
      value: controlledOpen,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    });

    // Flatten all options to find labels/icons
    const allOptions = useMemo(() => {
      if (groups) {
        return groups.flatMap((g) => g.options);
      }
      return options;
    }, [groups, options]);

    const selectedOptions = useMemo(() => {
      if (multiple && Array.isArray(currentValue)) {
        return allOptions.filter((opt) => currentValue.includes(opt.value));
      }
      if (!multiple && typeof currentValue === 'string') {
        const found = allOptions.find((opt) => opt.value === currentValue);
        return found ? [found] : [];
      }
      return [];
    }, [allOptions, currentValue, multiple]);

    const handleSelect = (val: string) => {
      if (multiple) {
        const currentArr = Array.isArray(currentValue) ? [...currentValue] : [];
        const index = currentArr.indexOf(val);
        const nextArr =
          index >= 0
            ? currentArr.filter((item) => item !== val)
            : [...currentArr, val];
        setCurrentValue(nextArr);
      } else {
        setCurrentValue(val);
        setOpen(false);
      }
    };

    const handleClear = () => {
      setCurrentValue([]);
    };

    const handleDone = () => {
      setOpen(false);
    };

    // The value when the popover opened, so Cancel can put it back.
    const latestValue = useRef(currentValue);
    latestValue.current = currentValue;
    const valueAtOpen = useRef(currentValue);
    useEffect(() => {
      if (isOpen) valueAtOpen.current = latestValue.current;
    }, [isOpen]);

    const handleDiscard = () => {
      const before = valueAtOpen.current;
      const now = latestValue.current;
      const same =
        Array.isArray(before) && Array.isArray(now)
          ? before.length === now.length && before.every((v, i) => v === now[i])
          : before === now;
      if (!same) setCurrentValue(before);
      setOpen(false);
    };

    const hasError = Boolean(error);
    const isLockedOrDisabled = Boolean(disabled || loading);

    // Multiple: as many chips as fit on one line, the rest as "+n". Widths are measured once per chip (all chips render for that pass, before paint), then fitted to the row.
    const chipRowRef = useRef<HTMLDivElement | null>(null);
    const [chipWidths, setChipWidths] = useState<Record<string, number>>({});
    const [overflowMeasure, setOverflowMeasure] = useState({ extent: 0, length: 0 });
    const [chipRow, setChipRow] = useState({ extent: 0, between: 0 });
    const selectedCount = selectedOptions.length;
    const hasChips = selectedCount > 0;
    const needsMeasure =
      multiple &&
      selectedCount > 0 &&
      (selectedOptions.some((opt) => chipWidths[chipKey(opt)] === undefined) ||
        String(selectedCount).length > String(overflowMeasure.length).length);

    const measureRow = useCallback(() => {
      const row = chipRowRef.current;
      if (!row) return;
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      setChipRow((prev) =>
        prev.extent === row.clientWidth && prev.between === gap ? prev : { extent: row.clientWidth, between: gap },
      );
    }, []);

    useLayoutEffect(() => {
      const row = chipRowRef.current;
      if (!row || !multiple) return;
      measureRow();
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(measureRow);
      observer.observe(row);
      return () => observer.disconnect();
    }, [multiple, loading, hasChips, measureRow]);

    useLayoutEffect(() => {
      const row = chipRowRef.current;
      if (!row || !needsMeasure) return;
      // A zero width means the row is hidden or not laid out yet: record nothing and measure again when it is.
      const next: Record<string, number> = { ...chipWidths };
      let recorded = false;
      row.querySelectorAll<HTMLElement>('[data-chip-key]').forEach((el) => {
        const w = el.getBoundingClientRect().width;
        if (w > 0) {
          next[el.dataset.chipKey as string] = w;
          recorded = true;
        }
      });
      if (recorded) setChipWidths(next);
      const overflowEl = row.querySelector<HTMLElement>('[data-chip-overflow]');
      const overflowWidth = overflowEl?.getBoundingClientRect().width ?? 0;
      if (overflowWidth > 0) {
        setOverflowMeasure({ extent: overflowWidth, length: selectedCount });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [needsMeasure, selectedOptions, loading, chipRow.extent]);

    const fitCount = needsMeasure
      ? selectedCount
      : fitChips(
          selectedOptions.map((opt) => chipWidths[chipKey(opt)] ?? 0),
          overflowMeasure.extent,
          chipRow.extent,
          chipRow.between,
        );
    // When not even the first chip fits beside its +n, it still shows, shrunk with an ellipsis.
    const shownCount = needsMeasure ? selectedCount : Math.max(fitCount, Math.min(1, selectedCount));
    const firstShrinks = !needsMeasure && fitCount === 0;
    const visibleChips = selectedOptions.slice(0, shownCount);
    const overflowCount = needsMeasure ? 0 : Math.max(0, selectedCount - shownCount);

    // Selected icon
    const displayIcon =
      explicitIcon ??
      (!multiple && selectedOptions.length > 0
        ? selectedOptions[0].icon
        : undefined);

    const triggerContent = (() => {
      if (loading) {
        return (
          <>
            <span className="font-text font-medium text-body text-ink-4 truncate flex-1 min-w-0">
              {loadingText}
            </span>
            <Icon name="spinner" size="md" className="animate-spin motion-reduce:animate-none" />
          </>
        );
      }

      if (multiple) {
        return (
          <>
            <div ref={chipRowRef} className="flex items-center gap-space-6 flex-nowrap overflow-hidden flex-1 min-w-0">
              {selectedOptions.length === 0 ? (
                placeholder ? (
                  <span className={cn('font-text font-medium text-ink-4 truncate', isSm ? 'text-label' : 'text-body')}>
                    {placeholder}
                  </span>
                ) : null
              ) : (
                <>
                  {visibleChips.map((opt, i) => (
                    <Badge
                      key={opt.value}
                      variant="outline"
                      shape="rounded"
                      data-chip-key={chipKey(opt)}
                      className={firstShrinks && i === 0 ? 'shrink min-w-0' : undefined}
                    >
                      <span className="truncate">{opt.label}</span>
                    </Badge>
                  ))}
                  {needsMeasure ? (
                    <Badge variant="outline" shape="rounded" data-chip-overflow="">
                      +{selectedCount}
                    </Badge>
                  ) : overflowCount > 0 ? (
                    <Badge variant="outline" shape="rounded">
                      +{overflowCount}
                    </Badge>
                  ) : null}
                </>
              )}
            </div>
            <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size="md" className={cn('shrink-0 ml-auto', disabled ? 'text-ink-faint' : 'text-ink-4')} />
          </>
        );
      }

      // Single select
      return (
        <>
          {displayIcon ? (
            <span className="shrink-0 flex items-center">{displayIcon}</span>
          ) : null}
          <span
            className={cn(
              'font-text font-medium truncate flex-1 min-w-0',
              isSm ? 'text-label' : 'text-body',
              selectedOptions.length > 0 ? 'text-ink' : 'text-ink-4',
            )}
          >
            {selectedOptions.length > 0
              ? selectedOptions[0].label
              : placeholder}
          </span>
          <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size="md" className={cn('shrink-0 ml-auto', disabled ? 'text-ink-faint' : 'text-ink-4')} />
        </>
      );
    })();

    const triggerButton = (
      <button
        ref={ref}
        id={id}
        type="button"
        disabled={isLockedOrDisabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-labelledby={label ? labelId : undefined}
        aria-invalid={hasError ? 'true' : undefined}
        aria-describedby={hasError || helper ? helperId : undefined}
        onClick={() => {
          if (!isLockedOrDisabled) setOpen(!isOpen);
        }}
        onKeyDown={(e) => {
          if (isLockedOrDisabled) return;
          if (
            e.key === 'ArrowDown' ||
            e.key === 'ArrowUp' ||
            e.key === 'Enter' ||
            e.key === ' '
          ) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          'w-full flex items-center text-left transition-colors duration-fast rounded-ds-md border bg-surface font-text font-medium text-ink',
          isSm ? 'text-label' : 'text-body',
          multiple && selectedOptions.length > 0
            ? 'min-h-control-md py-space-6 px-space-12 gap-space-6'
            : isSm
              ? 'h-control-sm px-space-8 gap-space-6'
              : 'h-control-md px-space-12 gap-space-8',
          disabled
            ? 'bg-sunken text-ink-faint border-line cursor-not-allowed opacity-60'
            : hasError
              ? 'border-danger focus-visible:ring-danger'
              : isOpen
                ? 'border-line-strong ring-2 ring-focus-ring ring-offset-2'
                : 'border-line-strong hover:border-line-strong focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
          triggerClassName,
        )}
        {...restProps}
      >
        {triggerContent}
      </button>
    );

    const effectiveTrigger = trigger ?? triggerButton;

    return (
      <FieldFrame
        id={id}
        labelId={labelId}
        helperId={helperId}
        label={label}
        helper={helper}
        error={error}
        className={cn(trigger ? 'inline-block w-auto' : 'w-full', className)}
      >
        {name ? (
          Array.isArray(currentValue) ? (
            currentValue.map((v) => (
              <input key={v} type="hidden" name={name} value={v} />
            ))
          ) : (
            <input type="hidden" name={name} value={currentValue ?? ''} />
          )
        ) : null}
        <Popover
          open={isOpen}
          onOpenChange={setOpen}
          trigger={effectiveTrigger}
          // One width rule for every select (owner, 2026-10-26): container-xs wide, grows to its content, capped at the viewport inset; never follows the trigger.
          contentClassName={cn('p-0 overflow-hidden w-max min-w-container-xs max-w-container-viewport-inset desk:max-w-container-viewport-inset', menuClassName)}
        >
          <SelectMenu
            id={id}
            options={options}
            groups={groups}
            value={currentValue}
            multiple={multiple}
            searchable={searchable}
            searchPlaceholder={searchPlaceholder}
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            onSelect={handleSelect}
            onClear={handleClear}
            onDone={handleDone}
            onDiscard={multiple ? handleDiscard : undefined}
            onClose={() => setOpen(false)}
            onCreate={onCreate}
            createLabel={createLabel}
            actions={actions}
            clearLabel={clearLabel}
            discardLabel={discardLabel}
            doneLabel={doneLabel}
            filter={filter}
            showRadio={showRadio}
            emptyText={emptyText}
            className={menuClassName}
          />
        </Popover>
      </FieldFrame>
    );
  },
);

Select.displayName = 'Select';
