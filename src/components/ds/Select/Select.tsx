import * as Popover from '@radix-ui/react-popover';
import { Lock } from 'lucide-react';
import React, { forwardRef, useId, useMemo, useState } from 'react';

import { Button } from '../Button/Button';
import { CategoryChip } from '../CategoryChip/CategoryChip';
import { cn } from '../cn';
import { SearchField } from '../SearchField/SearchField';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  hint?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  disabledReason?: string;
  group?: string;
}

export interface SelectGroup {
  name: string;
  options: SelectOption[];
}

export interface SelectMenuProps {
  options?: SelectOption[];
  groups?: SelectGroup[];
  value?: string | string[];
  multiple?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (query: string) => void;
  onSelect?: (value: string) => void;
  onClear?: () => void;
  onDone?: () => void;
  onCreate?: (query: string) => void;
  createLabel?: (query: string) => React.ReactNode;
  actionRow?: React.ReactNode;
  onActionClick?: () => void;
  showRadio?: boolean;
  className?: string;
  emptyText?: (query: string) => React.ReactNode;
}

export const SelectMenu = forwardRef<HTMLDivElement, SelectMenuProps>(
  (
    {
      options = [],
      groups,
      value,
      multiple = false,
      searchable = false,
      searchPlaceholder = 'Search…',
      searchValue: controlledSearch,
      onSearchChange,
      onSelect,
      onClear,
      onDone,
      onCreate,
      createLabel,
      actionRow,
      onActionClick,
      showRadio = false,
      className,
      emptyText,
    },
    ref,
  ) => {
    const [internalSearch, setInternalSearch] = useState('');
    const searchQuery =
      controlledSearch !== undefined ? controlledSearch : internalSearch;

    const handleSearchChange = (q: string) => {
      if (controlledSearch === undefined) {
        setInternalSearch(q);
      }
      onSearchChange?.(q);
    };

    const selectedValues = useMemo(() => {
      if (value === undefined || value === null) return new Set<string>();
      if (Array.isArray(value)) return new Set(value);
      return new Set([value]);
    }, [value]);

    // Flatten options if groups are used
    const processedGroups: SelectGroup[] = useMemo(() => {
      if (groups && groups.length > 0) {
        return groups;
      }
      // Check if options have group field
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
      if (!searchQuery.trim()) return processedGroups;
      const lower = searchQuery.toLowerCase();
      return processedGroups
        .map((g) => ({
          name: g.name,
          options: g.options.filter(
            (opt) =>
              opt.label.toLowerCase().includes(lower) ||
              (opt.description &&
                String(opt.description).toLowerCase().includes(lower)) ||
              (opt.hint && String(opt.hint).toLowerCase().includes(lower)),
          ),
        }))
        .filter((g) => g.options.length > 0);
    }, [processedGroups, searchQuery]);

    const totalMatches = useMemo(
      () => filteredGroups.reduce((acc, g) => acc + g.options.length, 0),
      [filteredGroups],
    );

    const renderOption = (opt: SelectOption) => {
      const isSelected = selectedValues.has(opt.value);
      const isDisabled = Boolean(opt.disabled);

      return (
        <div
          key={opt.value}
          role="option"
          aria-selected={isSelected}
          aria-disabled={isDisabled}
          tabIndex={isDisabled ? -1 : 0}
          onClick={() => {
            if (!isDisabled) {
              onSelect?.(opt.value);
            }
          }}
          onKeyDown={(e) => {
            if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onSelect?.(opt.value);
            }
          }}
          className={cn(
            'flex items-center gap-space-10 py-space-8 px-space-10 rounded-ds-md font-text font-semibold text-body transition-colors select-none outline-none',
            isDisabled
              ? 'text-ink-faint cursor-not-allowed opacity-60'
              : 'text-ink hover:bg-hover cursor-pointer focus-visible:bg-hover',
            isSelected &&
              !multiple &&
              !showRadio &&
              'bg-brand-tint text-brand-strong hover:bg-brand-tint',
          )}
        >
          {multiple ? (
            <span
              className={cn(
                'w-space-16 h-space-16 rounded-ds-xs border-2 shrink-0 flex items-center justify-center font-text font-extrabold text-caption select-none transition-colors',
                isSelected
                  ? 'bg-brand border-brand text-on-brand'
                  : 'border-line-strong bg-surface text-transparent',
              )}
            >
              ✓
            </span>
          ) : null}

          {showRadio ? (
            <span
              className={cn(
                'w-space-16 h-space-16 rounded-ds-pill border-2 shrink-0 flex items-center justify-center transition-colors',
                isSelected ? 'border-brand' : 'border-line-strong',
              )}
            >
              {isSelected ? (
                <span className="w-space-8 h-space-8 rounded-ds-pill bg-brand" />
              ) : null}
            </span>
          ) : null}

          {opt.icon ? (
            <span className="shrink-0 flex items-center">{opt.icon}</span>
          ) : null}

          <div className="flex-1 min-w-0">
            <span
              className={cn(
                'block font-text font-semibold text-body truncate',
                isSelected && !multiple && !showRadio
                  ? 'text-brand-strong'
                  : 'text-ink',
              )}
            >
              {opt.label}
            </span>
            {opt.description ? (
              <span className="block font-text font-medium text-caption text-ink-3 truncate">
                {opt.description}
              </span>
            ) : null}
          </div>

          {opt.disabledReason ? (
            <span className="ml-auto font-text font-semibold text-caption text-ink-4">
              {opt.disabledReason}
            </span>
          ) : opt.hint ? (
            <span className="ml-auto font-text font-semibold text-caption text-ink-4">
              {opt.hint}
            </span>
          ) : isSelected && !multiple && !showRadio ? (
            <span className="ml-auto font-text font-extrabold text-caption text-brand-strong">
              ✓
            </span>
          ) : null}
        </div>
      );
    };

    return (
      <div
        ref={ref}
        role="listbox"
        aria-multiselectable={multiple}
        className={cn(
          'bg-surface border border-line rounded-ds-lg shadow-pop p-space-6 flex flex-col w-full',
          className,
        )}
      >
        {searchable ? (
          <div className="mb-space-4">
            <SearchField
              value={searchQuery}
              placeholder={searchPlaceholder}
              onValueChange={handleSearchChange}
              autoFocus
            />
          </div>
        ) : null}

        <div className="flex flex-col overflow-y-auto max-h-72">
          {totalMatches === 0 && searchQuery.trim() ? (
            <div className="px-space-10 py-space-14 font-text text-label font-medium text-ink-3 text-center">
              {emptyText
                ? emptyText(searchQuery)
                : `No options match "${searchQuery}".`}
            </div>
          ) : null}

          {filteredGroups.map((g, gIdx) => (
            <React.Fragment key={g.name || gIdx}>
              {g.name ? (
                <div className="font-text text-overline font-extrabold uppercase text-ink-4 px-space-10 pt-space-8 pb-space-4 select-none">
                  {g.name}
                </div>
              ) : null}
              {g.options.map((opt) => renderOption(opt))}
            </React.Fragment>
          ))}
        </div>

        {searchQuery.trim() && onCreate ? (
          <>
            <div className="h-px bg-line-soft my-space-4 mx-space-6" />
            <div
              role="button"
              tabIndex={0}
              onClick={() => onCreate(searchQuery.trim())}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onCreate(searchQuery.trim());
                }
              }}
              className="flex items-center gap-space-8 py-space-8 px-space-10 rounded-ds-md font-text font-bold text-body text-brand hover:bg-hover cursor-pointer transition-colors"
            >
              {createLabel
                ? createLabel(searchQuery.trim())
                : `+ Add "${searchQuery.trim()}"`}
            </div>
          </>
        ) : null}

        {actionRow ? (
          <>
            <div className="h-px bg-line-soft my-space-4 mx-space-6" />
            <div
              role="button"
              tabIndex={0}
              onClick={onActionClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onActionClick?.();
                }
              }}
              className="flex items-center gap-space-8 py-space-8 px-space-10 rounded-ds-md font-text font-bold text-body text-brand hover:bg-hover cursor-pointer transition-colors"
            >
              {actionRow}
            </div>
          </>
        ) : null}

        {multiple ? (
          <div className="flex gap-space-8 px-space-6 pt-space-8 pb-space-4 border-t border-line-soft mt-space-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={onClear}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={onDone}
            >
              Done · {selectedValues.size}
            </Button>
          </div>
        ) : null}
      </div>
    );
  },
);

SelectMenu.displayName = 'SelectMenu';

export interface SelectProps {
  id?: string;
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  placeholder?: string;
  value?: string | string[];
  defaultValue?: string | string[];
  onChange?: (value: string | string[]) => void;
  options?: SelectOption[];
  groups?: SelectGroup[];
  multiple?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (query: string) => void;
  onCreate?: (query: string) => void;
  createLabel?: (query: string) => React.ReactNode;
  actionRow?: React.ReactNode;
  onActionClick?: () => void;
  maxDisplayChips?: number;
  disabled?: boolean;
  locked?: boolean;
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  showRadio?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  emptyText?: (query: string) => React.ReactNode;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      id: explicitId,
      label,
      helper,
      error,
      placeholder = 'Select an option…',
      value: controlledValue,
      defaultValue,
      onChange,
      options = [],
      groups,
      multiple = false,
      searchable = false,
      searchPlaceholder,
      searchValue,
      onSearchChange,
      onCreate,
      createLabel,
      actionRow,
      onActionClick,
      maxDisplayChips = 2,
      disabled = false,
      locked = false,
      loading = false,
      loadingText = 'Loading…',
      icon: explicitIcon,
      showRadio = false,
      open: controlledOpen,
      defaultOpen = false,
      onOpenChange,
      className,
      triggerClassName,
      menuClassName,
      emptyText,
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = explicitId || generatedId;
    const helperId = `${id}-helper`;

    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = useState<string | string[]>(
      defaultValue !== undefined ? defaultValue : multiple ? [] : '',
    );
    const currentValue = isControlled ? controlledValue : internalValue;

    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
    const isOpen =
      controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;

    const setOpen = (nextOpen: boolean) => {
      if (controlledOpen === undefined) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    };

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
        if (!isControlled) {
          setInternalValue(nextArr);
        }
        onChange?.(nextArr);
      } else {
        if (!isControlled) {
          setInternalValue(val);
        }
        onChange?.(val);
        setOpen(false);
      }
    };

    const handleClear = () => {
      const next: string[] = [];
      if (!isControlled) {
        setInternalValue(next);
      }
      onChange?.(next);
    };

    const handleDone = () => {
      setOpen(false);
    };

    const hasError = Boolean(error);
    const isLockedOrDisabled = Boolean(locked || disabled || loading);

    // Visible chips and overflow for multiple
    const visibleChips = selectedOptions.slice(0, maxDisplayChips);
    const overflowCount = Math.max(0, selectedOptions.length - maxDisplayChips);

    // Selected icon
    const displayIcon =
      explicitIcon ??
      (!multiple && selectedOptions.length > 0
        ? selectedOptions[0].icon
        : undefined);

    const triggerContent = (() => {
      if (locked) {
        return (
          <>
            <Lock
              className="w-space-14 h-space-14 text-ink-3 shrink-0"
              aria-hidden="true"
            />
            <span className="font-text font-medium text-body text-ink truncate flex-1 min-w-0">
              {selectedOptions.length > 0
                ? selectedOptions[0].label
                : placeholder}
            </span>
          </>
        );
      }

      if (loading) {
        return (
          <>
            <span className="font-text font-medium text-body text-ink-4 truncate flex-1 min-w-0">
              {loadingText}
            </span>
            <span className="font-text text-caption text-ink-4 select-none shrink-0">
              ▾
            </span>
          </>
        );
      }

      if (multiple) {
        return (
          <>
            <div className="flex items-center gap-space-6 flex-wrap flex-1 min-w-0">
              {selectedOptions.length === 0 ? (
                <span className="font-text font-medium text-body text-ink-4 truncate">
                  {placeholder}
                </span>
              ) : (
                <>
                  {visibleChips.map((opt) => (
                    <CategoryChip key={opt.value} variant="default">
                      {opt.label}
                    </CategoryChip>
                  ))}
                  {overflowCount > 0 ? (
                    <CategoryChip variant="count" count={overflowCount} />
                  ) : null}
                </>
              )}
            </div>
            <span className="font-text text-caption text-ink-4 select-none shrink-0 ml-auto">
              ▾
            </span>
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
              'font-text font-medium text-body truncate flex-1 min-w-0',
              selectedOptions.length > 0 ? 'text-ink' : 'text-ink-4',
            )}
          >
            {selectedOptions.length > 0
              ? selectedOptions[0].label
              : placeholder}
          </span>
          <span className="font-text text-caption text-ink-4 select-none shrink-0 ml-auto">
            ▾
          </span>
        </>
      );
    })();

    return (
      <div className={cn('w-full', className)}>
        {label ? (
          <label
            htmlFor={id}
            className="block font-text text-label font-bold text-ink-2 mb-space-6"
          >
            {label}
          </label>
        ) : null}

        <Popover.Root open={isOpen} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <button
              ref={ref}
              id={id}
              type="button"
              disabled={isLockedOrDisabled}
              aria-haspopup="listbox"
              aria-expanded={isOpen}
              aria-describedby={hasError || helper ? helperId : undefined}
              className={cn(
                'w-full flex items-center text-left transition-colors duration-fast rounded-ds-md border bg-surface font-text font-medium text-body text-ink',
                multiple && selectedOptions.length > 0
                  ? 'min-h-control-lg py-space-6 px-space-12 gap-space-6'
                  : 'h-control-lg px-space-12 gap-space-8',
                hasError
                  ? 'border-danger focus-visible:ring-danger'
                  : isOpen
                    ? 'border-brand ring-2 ring-focus-ring ring-offset-2'
                    : 'border-line-strong hover:border-line-strong focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:border-brand',
                locked && 'bg-sunken text-ink-3 cursor-not-allowed',
                disabled &&
                  'bg-sunken text-ink-faint border-line cursor-not-allowed opacity-60',
                triggerClassName,
              )}
            >
              {triggerContent}
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={4}
              className="z-sticky w-full max-w-sm outline-none"
            >
              <SelectMenu
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
                onCreate={onCreate}
                createLabel={createLabel}
                actionRow={actionRow}
                onActionClick={onActionClick}
                showRadio={showRadio}
                emptyText={emptyText}
                className={menuClassName}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {hasError ? (
          <p
            id={helperId}
            className="font-text text-caption font-medium text-danger mt-space-6"
          >
            {error}
          </p>
        ) : helper ? (
          <p
            id={helperId}
            className="font-text text-caption font-medium text-ink-3 mt-space-6"
          >
            {helper}
          </p>
        ) : null}
      </div>
    );
  },
);

Select.displayName = 'Select';
