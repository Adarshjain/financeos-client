import { Search, X } from 'lucide-react';
import React, { forwardRef, useId, useRef, useState } from 'react';

import { cn } from '../cn';

export interface SearchFieldProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'size' | 'prefix' | 'onChange'
  > {
  variant?: 'filter' | 'sheet';
  label?: React.ReactNode;
  helper?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  onValueChange?: (value: string) => void;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  containerClassName?: string;
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  (
    {
      id: explicitId,
      variant = 'filter',
      label,
      helper,
      clearable = true,
      onClear,
      onValueChange,
      onChange,
      value: controlledValue,
      defaultValue,
      disabled,
      placeholder = 'Search…',
      className,
      containerClassName,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = explicitId || generatedId;
    const helperId = `${id}-helper`;

    const internalInputRef = useRef<HTMLInputElement>(null);
    const resolvedRef = (ref || internalInputRef) as React.RefObject<HTMLInputElement>;

    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = useState<string>(
      defaultValue !== undefined ? String(defaultValue) : '',
    );

    const currentValue = isControlled ? String(controlledValue) : internalValue;
    const hasValue = currentValue.length > 0;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setInternalValue(event.target.value);
      }
      onChange?.(event);
      onValueChange?.(event.target.value);
    };

    const handleClear = () => {
      if (!isControlled) {
        setInternalValue('');
      }
      onValueChange?.('');
      onClear?.();

      const inputEl = resolvedRef.current;
      if (inputEl) {
        // Create synthetic change event for input
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(inputEl, '');
        } else {
          inputEl.value = '';
        }
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.focus();
      }
    };

    const isSheet = variant === 'sheet';

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

        <div
          className={cn(
            'flex items-center gap-space-8 rounded-ds-md border border-line-strong bg-surface font-text font-medium text-body text-ink',
            'transition-colors duration-fast focus-within:ring-2 focus-within:ring-focus-ring focus-within:ring-offset-2 focus-within:border-brand',
            isSheet ? 'h-control-lg px-space-12' : 'h-control-md px-space-10',
            disabled &&
              'bg-sunken text-ink-faint border-line cursor-not-allowed opacity-60',
            containerClassName,
          )}
        >
          <Search
            className="h-space-14 w-space-14 text-ink-3 shrink-0"
            aria-hidden="true"
          />

          <input
            ref={resolvedRef}
            id={id}
            type="search"
            role="searchbox"
            value={currentValue}
            placeholder={placeholder}
            disabled={disabled}
            aria-describedby={helper ? helperId : undefined}
            onChange={handleChange}
            className={cn(
              'w-full bg-transparent border-0 p-0 font-text text-body font-medium text-ink placeholder:text-ink-4 focus:outline-none focus:ring-0',
              '[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
              disabled && 'cursor-not-allowed text-ink-faint',
            )}
            {...props}
          />

          {clearable && hasValue && !disabled ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={handleClear}
              className="inline-flex items-center justify-center text-ink-4 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-ds-xs transition-colors shrink-0"
            >
              <X className="h-space-12 w-space-12" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {helper ? (
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

SearchField.displayName = 'SearchField';
