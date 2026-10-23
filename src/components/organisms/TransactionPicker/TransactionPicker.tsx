'use client';

import React, { forwardRef } from 'react';

import {
  Checkbox,
  cn,
  Highlight,
  Icon,
  ListRow,
  Pager,
  Radio,
  SegmentedControl,
  Skeleton,
  Text,
  TextField,
  useControllableState,
} from '@/components/ds';

export interface TransactionPickerItem {
  id: string;
  title: string;
  subtitle?: string;
  /** Formatted by the page, e.g. "24,990.00" */
  amount: string;
  isCredit?: boolean;
  disabled?: boolean;
  /** Shown after the subtitle on a disabled row */
  disabledReason?: string;
}

export type TransactionPickerFilter = 'all' | 'debit' | 'credit';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
] as const;

export interface TransactionPickerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  items: TransactionPickerItem[];
  /** False: one choice (Radio rows). True: many (Checkbox rows). */
  multiple?: boolean;
  /** Selected id (single) or ids (multiple) */
  value?: string | string[] | null;
  defaultValue?: string | string[] | null;
  onValueChange?: (value: string | string[] | null) => void;
  /** Search text. The page fetches; the picker never filters items. */
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  searchPlaceholder?: string;
  loading?: boolean;
  /** Debit / credit filter. Shown only when `onFilterChange` is given. The page fetches; the picker never filters. */
  filter?: TransactionPickerFilter;
  defaultFilter?: TransactionPickerFilter;
  onFilterChange?: (filter: TransactionPickerFilter) => void;
  /** Server-side paging: 0-based `page`, rows per page `pageSize`, and the server's `totalElements`. The Pager shows above and below the list when there is more than one page. */
  page?: number;
  pageSize?: number;
  totalElements?: number;
  onPageChange?: (page: number) => void;
  emptyLabel?: React.ReactNode;
  /** Caption above the list, e.g. "Open entries with Rahul Sharma" */
  label?: React.ReactNode;
  error?: React.ReactNode;
}

const SKELETON_ROWS = 3;

export const TransactionPicker = forwardRef<HTMLDivElement, TransactionPickerProps>(
  (
    {
      items,
      multiple = false,
      value: valueProp,
      defaultValue,
      onValueChange,
      query: queryProp,
      defaultQuery = '',
      onQueryChange,
      searchPlaceholder = 'Search…',
      loading = false,
      filter: filterProp,
      defaultFilter = 'all',
      onFilterChange,
      page = 0,
      pageSize = 50,
      totalElements = 0,
      onPageChange,
      emptyLabel,
      label,
      error,
      className,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllableState<string | string[] | null>({
      value: valueProp,
      defaultValue: defaultValue ?? (multiple ? [] : null),
      onChange: onValueChange,
    });
    const [query, setQuery] = useControllableState<string>({
      value: queryProp,
      defaultValue: defaultQuery,
      onChange: onQueryChange,
    });

    const [filter, setFilter] = useControllableState<TransactionPickerFilter>({
      value: filterProp,
      defaultValue: defaultFilter,
      onChange: onFilterChange,
    });

    const selectedIds = Array.isArray(value) ? value : value ? [value] : [];

    const select = (id: string) => {
      if (multiple) {
        setValue(
          selectedIds.includes(id)
            ? selectedIds.filter((x) => x !== id)
            : [...selectedIds, id],
        );
      } else if (selectedIds[0] !== id) {
        setValue(id);
      }
    };

    const showSkeleton = loading && items.length === 0;
    const showEmpty = !loading && items.length === 0;
    const showPager = !!onPageChange && totalElements > pageSize;
    const pager = (position: 'above' | 'below') =>
      showPager ? (
        <Pager
          data-testid={`picker-pager-${position}`}
          variant="compact"
          borderPosition="none"
          className="px-0"
          page={page}
          size={pageSize}
          totalElements={totalElements}
          onPageChange={onPageChange}
        />
      ) : null;

    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-space-8', className)}
        {...props}
      >
        {label ? (
          <Text as="div" variant="label" tone="ink-3">
            {label}
          </Text>
        ) : null}

        <TextField
          type="search"
          size="md"
          clearable
          clearLabel="Clear search"
          placeholder={searchPlaceholder}
          prefix={<Icon name="search" size="sm" />}
          value={query}
          onValueChange={setQuery}
        />

        {onFilterChange ? (
          <SegmentedControl<TransactionPickerFilter>
            size="sm"
            className="self-start"
            aria-label="Transaction type"
            data-testid="picker-filter"
            options={[...FILTER_OPTIONS]}
            value={filter}
            onValueChange={setFilter}
          />
        ) : null}

        {pager('above')}

        <div
          role={multiple ? 'group' : 'radiogroup'}
          aria-busy={loading || undefined}
          className="flex flex-col"
        >
          {showSkeleton
            ? Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <ListRow
                  key={i}
                  data-testid="picker-skeleton"
                  className="px-0"
                  title={<Skeleton width="60%" height={14} />}
                  subtitle={<Skeleton width="40%" height={12} />}
                  trailing={<Skeleton width={64} height={14} />}
                />
              ))
            : items.map((item) => {
                const checked = selectedIds.includes(item.id);
                const name = item.title;
                return (
                  <ListRow
                    key={item.id}
                    role={multiple ? 'checkbox' : 'radio'}
                    aria-checked={checked}
                    aria-label={name}
                    wrap
                    className="px-0"
                    disabled={item.disabled}
                    onClick={() => select(item.id)}
                    leading={
                      multiple ? (
                        <Checkbox
                          checked={checked}
                          tabIndex={-1}
                          aria-hidden="true"
                        />
                      ) : (
                        <Radio
                          checked={checked}
                          tabIndex={-1}
                          aria-hidden="true"
                        />
                      )
                    }
                    title={<Highlight text={item.title} query={query} />}
                    subtitle={
                      item.subtitle || (item.disabled && item.disabledReason) ? (
                        <>
                          {item.subtitle ? (
                            <Highlight text={item.subtitle} query={query} />
                          ) : null}
                          {item.disabled && item.disabledReason
                            ? `${item.subtitle ? ' · ' : ''}${item.disabledReason}`
                            : null}
                        </>
                      ) : undefined
                    }
                    trailing={
                      <Text
                        variant="body-strong"
                        tone={item.isCredit ? 'positive' : 'ink'}
                        className="tabular-nums"
                        fraction="small"
                      >
                        {query ? <Highlight text={item.amount} query={query} /> : item.amount}
                      </Text>
                    }
                  />
                );
              })}
        </div>

        {showEmpty && emptyLabel ? (
          <Text as="div" variant="body" tone="ink-3">
            {emptyLabel}
          </Text>
        ) : null}

        {pager('below')}

        {error ? (
          <Text as="div" variant="caption" tone="danger">
            {error}
          </Text>
        ) : null}
      </div>
    );
  },
);

TransactionPicker.displayName = 'TransactionPicker';
