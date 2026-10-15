import { Search, X } from 'lucide-react';
import React, { forwardRef, useId, useRef, useState } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { FieldFrame } from '../FieldFrame';
import { Icon } from '../Icon/Icon';

export interface SearchFieldProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'size' | 'prefix' | 'onChange'
  > {
  variant?: 'filter' | 'sheet';
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
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
      error,
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
            'flex items-center gap-space-8 rounded-ds-md border border-line-strong bg-surface font-text font-medium text-body text-ink',
            'transition-colors duration-fast focus-within:ring-2 focus-within:ring-focus-ring focus-within:ring-offset-2 focus-within:border-brand',
            isSheet ? 'h-control-lg px-space-12' : 'h-control-md px-space-10',
            disabled &&
              'bg-sunken text-ink-faint border-line cursor-not-allowed opacity-60',
            containerClassName,
          )}
        >
          <Icon
            icon={Search}
            size="sm"
            className="text-ink-3 shrink-0"
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
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Clear search"
              onClick={handleClear}
              className="text-ink-4 hover:text-ink shrink-0"
            >
              <Icon icon={X} size="sm" />
            </Button>
          ) : null}
        </div>
      </FieldFrame>
    );
  },
);

SearchField.displayName = 'SearchField';
