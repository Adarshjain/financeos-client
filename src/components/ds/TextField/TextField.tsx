'use client';

import React, { forwardRef, useCallback, useId, useRef, useState } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { FieldFrame } from '../FieldFrame';
import { Icon } from '../Icon/Icon';
import { useControllableState } from '../useControllableState';

export type TextFieldSize = 'md' | 'lg';
export type TextFieldVariant = 'default' | 'embedded';

export interface TextFieldProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'prefix' | 'size' | 'ref'
  > {
  size?: TextFieldSize;
  variant?: TextFieldVariant;
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  optional?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  clearLabel?: string;
  controlClassName?: string;
  onValueChange?: (value: string) => void;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      id: explicitId,
      size = 'lg',
      variant = 'default',
      type = 'text',
      inputMode,
      label,
      helper,
      error,
      optional = false,
      disabled = false,
      prefix,
      suffix,
      clearable = false,
      onClear,
      clearLabel = 'Clear',
      className,
      controlClassName,
      placeholder,
      value: controlledValue,
      defaultValue,
      onChange,
      onValueChange,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = explicitId ?? generatedId;
    const helperId = `${id}-helper`;
    const [showPassword, setShowPassword] = useState(false);

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

    const [value, setValue] = useControllableState<string>({
      value: controlledValue !== undefined ? String(controlledValue) : undefined,
      defaultValue: defaultValue !== undefined ? String(defaultValue) : '',
      onChange: onValueChange,
    });

    const isPassword = type === 'password';
    const computedType = isPassword && showPassword ? 'text' : type;

    const hasError = Boolean(error);
    const isNumeric =
      inputMode === 'decimal' || inputMode === 'numeric' || type === 'number';

    const isLg = size === 'lg';
    const isEmbedded = variant === 'embedded';
    const hasValue = value.length > 0;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
      onChange?.(e);
    };

    const handleClear = () => {
      setValue('');
      onClear?.();
      internalInputRef.current?.focus();
    };

    return (
      <FieldFrame
        id={id}
        helperId={helperId}
        label={label}
        optional={optional}
        helper={helper}
        error={error}
        className={cn('w-full', className)}
      >
        <div
          className={cn(
            'flex items-center gap-space-8 w-full border rounded-ds-md bg-surface font-text font-medium text-body text-ink transition-colors duration-fast',
            isLg ? 'h-control-lg px-space-12' : 'h-control-md px-space-10',
            isEmbedded
              ? 'focus-within:ring-0 focus-within:ring-offset-0'
              : 'focus-within:ring-2 focus-within:ring-focus-ring focus-within:ring-offset-2',
            hasError
              ? 'border-danger focus-within:ring-danger'
              : 'border-line-strong',
            isEmbedded && !hasError && 'focus-within:border-brand',
            disabled &&
              'bg-sunken text-ink-faint border-line cursor-not-allowed opacity-60',
          )}
        >
          {prefix ? (
            <span className="text-ink-3 font-semibold text-body select-none shrink-0 flex items-center">
              {prefix}
            </span>
          ) : null}

          <input
            ref={combinedRef}
            id={id}
            type={computedType}
            inputMode={inputMode}
            disabled={disabled}
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
            aria-invalid={hasError ? 'true' : undefined}
            aria-describedby={hasError || helper ? helperId : undefined}
            className={cn(
              'w-full h-full bg-transparent border-0 p-0 text-body text-ink placeholder:text-ink-4 focus:outline-none focus:ring-0',
              type === 'search' &&
                '[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
              isNumeric && 'tabular-nums',
              disabled && 'cursor-not-allowed text-ink-faint',
              controlClassName,
            )}
            {...props}
          />

          {clearable && hasValue && !disabled ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={clearLabel}
              onClick={handleClear}
              className="text-ink-4 hover:text-ink shrink-0"
            >
              <Icon name="close" size="sm" />
            </Button>
          ) : null}

          {isPassword ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="ml-auto text-label font-bold text-ink-2 hover:text-ink shrink-0 h-auto py-0 px-space-4"
            >
              {showPassword ? 'Hide' : 'Show'}
            </Button>
          ) : null}

          {suffix ? (
            <span className="ml-auto shrink-0 flex items-center text-ink-4">
              {suffix}
            </span>
          ) : null}
        </div>
      </FieldFrame>
    );
  },
);

TextField.displayName = 'TextField';
