'use client';

import React, {
  forwardRef,
  useId,
  useMemo,
  useState,
} from 'react';

import { Button } from '../Button/Button';
import { CategoryChip } from '../CategoryChip/CategoryChip';
import { Checkbox } from '../Checkbox/Checkbox';
import { cn } from '../cn';
import { Dialog, DialogBody, DialogContent } from '../Dialog/Dialog';
import { FieldFrame } from '../FieldFrame';
import { Icon } from '../Icon/Icon';
import { getItemRowClass } from '../itemRow';
import { PopoverContent, PopoverRoot, PopoverTrigger } from '../Popover/Popover';
import { SearchField } from '../SearchField/SearchField';
import { useIsPhone } from '../useMediaQuery';

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
  id?: string;
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
  onClose?: () => void;
  onCreate?: (query: string) => void;
  createLabel?: (query: string) => React.ReactNode;
  actionRow?: React.ReactNode;
  onActionClick?: () => void;
  showRadio?: boolean;
  className?: string;
  emptyText?: (query: string) => React.ReactNode;
  isSheet?: boolean;
}

export const SelectMenu = forwardRef<HTMLDivElement, SelectMenuProps>(
  (
    {
      id: explicitId,
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
      onClose,
      onCreate,
      createLabel,
      actionRow,
      onActionClick,
      showRadio = false,
      className,
      emptyText,
      isSheet = false,
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = explicitId || generatedId;
    const listboxId = `${id}-listbox`;

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
      if (
        value &&
        typeof value === 'string' &&
        flatEnabledOptions.some((opt) => opt.value === value)
      ) {
        return value;
      }
      return flatEnabledOptions[0]?.value ?? null;
    }, [highlightedValue, flatEnabledOptions, value]);

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
          onSelect?.(effectiveHighlighted);
        } else if (searchQuery.trim() && onCreate) {
          onCreate(searchQuery.trim());
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
              onSelect?.(opt.value);
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
                'block font-text font-medium text-body truncate',
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
            <span className="ml-auto font-text font-medium text-caption text-ink-4">
              {opt.disabledReason}
            </span>
          ) : opt.hint ? (
            <span className="ml-auto font-text font-medium text-caption text-ink-4">
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
          'flex flex-col w-full outline-none',
          isSheet ? 'p-space-16 bg-surface' : 'p-space-2',
          className,
        )}
      >
        {searchable ? (
          <div className="mb-space-8">
            <SearchField
              value={searchQuery}
              placeholder={searchPlaceholder}
              onValueChange={handleSearchChange}
              containerClassName="focus-within:ring-0 focus-within:ring-offset-0 focus-within:border-brand"
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
          className="flex flex-col overflow-y-auto max-h-72 outline-none touch-pan-y"
        >
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
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  trigger?: React.ReactNode;
  showRadio?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  emptyText?: (query: string) => React.ReactNode;
  forceSheet?: boolean;
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
      loading = false,
      loadingText = 'Loading…',
      icon: explicitIcon,
      trigger,
      showRadio = false,
      open: controlledOpen,
      defaultOpen = false,
      onOpenChange,
      className,
      triggerClassName,
      menuClassName,
      emptyText,
      forceSheet,
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = explicitId || generatedId;
    const helperId = `${id}-helper`;
    const labelId = `${id}-label`;
    const listboxId = `${id}-listbox`;

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

    const isPhone = useIsPhone();
    const showSheet = forceSheet ?? isPhone;

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
    const isLockedOrDisabled = Boolean(disabled || loading);

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
      if (loading) {
        return (
          <>
            <span className="font-text font-medium text-body text-ink-4 truncate flex-1 min-w-0">
              {loadingText}
            </span>
            <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size="md" className="text-ink-4 shrink-0" />
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
            <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size="md" className="text-ink-4 shrink-0 ml-auto" />
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
          <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size="md" className="text-ink-4 shrink-0 ml-auto" />
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
          'w-full flex items-center text-left transition-colors duration-fast rounded-ds-md border bg-surface font-text font-medium text-body text-ink',
          multiple && selectedOptions.length > 0
            ? 'min-h-control-lg py-space-6 px-space-12 gap-space-6'
            : 'h-control-lg px-space-12 gap-space-8',
          hasError
            ? 'border-danger focus-visible:ring-danger'
            : isOpen
              ? 'border-brand ring-2 ring-focus-ring ring-offset-2'
              : 'border-line-strong hover:border-line-strong focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:border-brand',
          disabled &&
            'bg-sunken text-ink-faint border-line cursor-not-allowed opacity-60',
          triggerClassName,
        )}
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
        className={cn(trigger ? 'inline-block' : 'w-full', className)}
      >
        {showSheet ? (
          <>
            <div
              onClick={() => {
                if (!isLockedOrDisabled) setOpen(!isOpen);
              }}
              className={trigger ? 'inline-block' : 'w-full'}
            >
              {effectiveTrigger}
            </div>
            <Dialog open={isOpen} onOpenChange={setOpen}>
              <DialogContent
                title={label || placeholder || 'Select'}
                onClose={() => setOpen(false)}
                className="max-h-dvh"
              >
                <DialogBody className="p-0">
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
                    onClose={() => setOpen(false)}
                    onCreate={onCreate}
                    createLabel={createLabel}
                    actionRow={actionRow}
                    onActionClick={onActionClick}
                    showRadio={showRadio}
                    emptyText={emptyText}
                    isSheet
                    className={menuClassName}
                  />
                </DialogBody>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <PopoverRoot open={isOpen} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{effectiveTrigger}</PopoverTrigger>
            <PopoverContent className={menuClassName}>
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
                onClose={() => setOpen(false)}
                onCreate={onCreate}
                createLabel={createLabel}
                actionRow={actionRow}
                onActionClick={onActionClick}
                showRadio={showRadio}
                emptyText={emptyText}
              />
            </PopoverContent>
          </PopoverRoot>
        )}
      </FieldFrame>
    );
  },
);

Select.displayName = 'Select';
