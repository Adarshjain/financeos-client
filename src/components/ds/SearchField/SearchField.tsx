'use client';

import React, { forwardRef, useCallback, useId, useRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { FieldFrame } from '../FieldFrame';
import { Icon } from '../Icon/Icon';
import { useControllableState } from '../useControllableState';

export interface SearchFieldProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'size' | 'prefix'
  > {
  size?: 'md' | 'lg';
  variant?: 'default' | 'embedded';
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  onValueChange?: (value: string) => void;
  controlClassName?: string;
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  (
    {
      id: explicitId,
      size = 'md',
      variant = 'default',
      label,
      helper,
      error,
      clearable = true,
      onClear,
      onValueChange,
      value: controlledValue,
      defaultValue,
      disabled,
      placeholder = 'Search…',
      className,
      controlClassName,
      onChange,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = explicitId || generatedId;
    const helperId = `${id}-helper`;

    const internalInputRef = useRef<HTMLInputElement | null>(null);
    const combinedRef = useCallback(
      (node: HTMLInputElement | null) => {
        internalInputRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
        }
      },
      [ref],
    );

    const [value, setValue] = useControllableState({
      value: controlledValue !== undefined ? String(controlledValue) : undefined,
      defaultValue: defaultValue !== undefined ? String(defaultValue) : '',
      onChange: onValueChange,
    });

    const hasValue = value.length > 0;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue(event.target.value);
      onChange?.(event);
    };

    const handleClear = () => {
      setValue('');
      onClear?.();
      internalInputRef.current?.focus();
    };

    const isLg = size === 'lg';
    const isEmbedded = variant === 'embedded';

    return (
      <FieldFrame
        id={id}
        helperId={helperId}
        label={label}
        helper={helper}
        error={error}
        className={cn('w-full', className)}
      >
        <div
          className={cn(
            'flex items-center gap-space-8 rounded-ds-md border border-line-strong bg-surface font-text font-medium text-body text-ink transition-colors duration-fast',
            isEmbedded
              ? 'focus-within:border-brand focus-within:ring-0 focus-within:ring-offset-0'
              : 'focus-within:ring-2 focus-within:ring-focus-ring focus-within:ring-offset-2 focus-within:border-brand',
            isLg ? 'h-control-lg px-space-12' : 'h-control-md px-space-10',
            disabled &&
              'bg-sunken text-ink-faint border-line cursor-not-allowed opacity-60',
          )}
        >
          <Icon
            name="search"
            size="sm"
            className="text-ink-3 shrink-0"
          />

          <input
            ref={combinedRef}
            id={id}
            type="search"
            role="searchbox"
            value={value}
            placeholder={placeholder}
            disabled={disabled}
            aria-describedby={helper ? helperId : undefined}
            onChange={handleChange}
            className={cn(
              'w-full bg-transparent border-0 p-0 font-text text-body font-medium text-ink placeholder:text-ink-4 focus:outline-none focus:ring-0',
              '[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
              disabled && 'cursor-not-allowed text-ink-faint',
              controlClassName,
            )}
            {...props}
          />

          {clearable && hasValue && !disabled ? (
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Clear search"
              onClick={handleClear}
              className="text-ink-4 hover:text-ink shrink-0"
            >
              <Icon name="close" size="sm" />
            </Button>
          ) : null}
        </div>
      </FieldFrame>
    );
  },
);

SearchField.displayName = 'SearchField';

