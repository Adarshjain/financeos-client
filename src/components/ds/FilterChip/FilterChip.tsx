'use client';

import React, { forwardRef } from 'react';

import { Badge } from '../Badge/Badge';
import { cn } from '../cn';
import { concealMoney } from '../Conceal/concealMoney';
import { Icon } from '../Icon/Icon';
import { useControllableState } from '../useControllableState';
import { capCount } from '../utils';

export type FilterChipVariant =
  | 'outline'
  | 'soft'
  | 'dashed'
  | 'default'
  | 'amber'
  | 'more';

export type FilterChipTone = 'brand' | 'warning' | 'neutral';

export type FilterChipSize = 'sm' | 'md';

export type FilterChipShape = 'pill' | 'rounded';

export interface FilterChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  /** Controlled selected state */
  selected?: boolean;
  /** Initial selected state when uncontrolled */
  defaultSelected?: boolean;
  /** Callback fired when selected state changes */
  onSelectedChange?: (selected: boolean) => void;
  /** Look variant: outline when off, soft when on, or dashed for '+ More' */
  variant?: FilterChipVariant;
  /** Semantic tone when selected: brand (default), warning (review), or neutral */
  tone?: FilterChipTone;
  /** Height: sm is 28px (default); md matches TextField's default control height */
  size?: FilterChipSize;
  /** Corners: pill (default) or rounded, the same corners as TextField */
  shape?: FilterChipShape;
  /** Whether the chip acts as a dropdown trigger with a chevron */
  hasDropdown?: boolean;
  /** Numeric count shown in a count badge */
  count?: number;
  /** Whether the chip shows a remove button */
  removable?: boolean;
  /** Callback fired when remove button is clicked */
  onRemove?: (e: React.MouseEvent) => void;
}

export const FilterChip = forwardRef<HTMLButtonElement, FilterChipProps>(
  (
    {
      children,
      selected,
      defaultSelected = false,
      onSelectedChange,
      variant,
      tone,
      size = 'sm',
      shape = 'pill',
      hasDropdown = false,
      count,
      removable = false,
      onRemove,
      disabled = false,
      className,
      onClick,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const [isSelected, setIsSelected] = useControllableState<boolean>({
      value: selected,
      defaultValue: defaultSelected,
      onChange: onSelectedChange,
    });

    const isAmber = variant === 'amber' || tone === 'warning';
    const isDashed = variant === 'dashed' || variant === 'more';
    const isSoft =
      variant === 'soft' || (!isDashed && variant !== 'outline' && isSelected);

    const isMd = size === 'md';
    const isRounded = shape === 'rounded';
    const heightClass = isMd ? 'h-control-md' : 'h-space-28';
    const radiusClass = isRounded ? 'rounded-ds-md' : 'rounded-ds-pill';
    const radiusLeftClass = isRounded ? 'rounded-l-ds-md' : 'rounded-l-ds-pill';
    const radiusRightClass = isRounded ? 'rounded-r-ds-md' : 'rounded-r-ds-pill';

    const showRemove = removable || Boolean(onRemove);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (!e.defaultPrevented && !disabled) {
        setIsSelected(!isSelected);
      }
    };

    const handleRemoveClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove?.(e);
    };

    const countNode =
      count !== undefined && count !== null ? (
        <Badge variant="solid" shape="rounded" size="sm">
          {capCount(count)}
        </Badge>
      ) : null;

    const dropdownNode = hasDropdown ? (
      <Icon name="chevron-down" size="sm" className="text-current shrink-0" />
    ) : null;

    const toneClasses = cn(
      isDashed &&
        'border-dashed border-line-strong bg-surface text-ink-2 hover:bg-hover active:bg-pressed',
      !isDashed &&
        !isSoft &&
        'border-line-strong bg-surface text-ink-2 hover:bg-hover active:bg-pressed',
      !isDashed &&
        isSoft &&
        isAmber &&
        'bg-warning-tint border-warning-border text-warning hover:bg-warning-tint',
      !isDashed &&
        isSoft &&
        tone === 'neutral' &&
        'bg-subtle border-line-strong text-ink hover:bg-subtle',
      !isDashed &&
        isSoft &&
        !isAmber &&
        tone !== 'neutral' &&
        'bg-brand-tint border-brand-border text-brand-strong hover:bg-brand-tint',
    );

    if (showRemove) {
      return (
        <span
          ref={ref as unknown as React.Ref<HTMLSpanElement>}
          className={cn(
            'inline-flex items-center border font-text font-semibold text-label whitespace-nowrap select-none transition-colors duration-fast',
            heightClass,
            radiusClass,
            toneClasses,
            disabled && 'opacity-50 cursor-not-allowed',
            className,
          )}
        >
          <button
            type={type}
            disabled={disabled}
            onClick={handleClick}
            className={cn(
              'inline-flex items-center gap-space-6 h-full pr-space-4 bg-transparent border-0 text-inherit font-text font-semibold text-label cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed',
              isMd ? 'pl-space-12' : 'pl-space-10',
              radiusLeftClass,
            )}
            {...props}
          >
            <span>{concealMoney(children)}</span>
            {countNode}
            {dropdownNode}
          </button>
          <button
            type="button"
            disabled={disabled}
            aria-label="Remove filter"
            onClick={handleRemoveClick}
            className={cn(
              'inline-flex items-center justify-center h-full pl-space-2 bg-transparent border-0 text-inherit font-text font-semibold text-label cursor-pointer opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed',
              isMd ? 'pr-space-10' : 'pr-space-8',
              radiusRightClass,
            )}
          >
            <Icon name="close" size="sm" />
          </button>
        </span>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          'inline-flex items-center gap-space-6 border font-text font-semibold text-label whitespace-nowrap transition-colors duration-fast select-none cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
          heightClass,
          radiusClass,
          isMd ? 'px-space-12' : 'px-space-10',
          toneClasses,
          disabled && 'opacity-50 cursor-not-allowed',
          className,
        )}
        {...props}
      >
        <span>{concealMoney(children)}</span>
        {countNode}
        {dropdownNode}
      </button>
    );
  },
);

FilterChip.displayName = 'FilterChip';
