'use client';

import React, { forwardRef, useId, useState } from 'react';

import { cn } from '../cn';

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  options: Array<SegmentedControlOption<T> | T>;
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
  fullWidth?: boolean;
  disabled?: boolean;
}

export const SegmentedControl = forwardRef<
  HTMLDivElement,
  SegmentedControlProps
>(
  (
    {
      options,
      value: controlledValue,
      defaultValue,
      onChange,
      fullWidth = false,
      disabled = false,
      className,
      'aria-label': ariaLabel,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();

    const normalizedOptions: SegmentedControlOption[] = options.map((opt) =>
      typeof opt === 'string' ? { value: opt, label: opt } : opt,
    );

    const firstValue = normalizedOptions[0]?.value ?? '';
    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = useState<string>(
      defaultValue !== undefined ? defaultValue : firstValue,
    );

    const currentValue = isControlled ? controlledValue : internalValue;

    const handleSelect = (val: string, optDisabled?: boolean) => {
      if (disabled || optDisabled) return;
      if (!isControlled) {
        setInternalValue(val);
      }
      onChange?.(val);
    };

    const handleKeyDown = (
      e: React.KeyboardEvent<HTMLButtonElement>,
      index: number,
    ) => {
      let nextIndex = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextIndex = (index + 1) % normalizedOptions.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        nextIndex =
          (index - 1 + normalizedOptions.length) % normalizedOptions.length;
      }

      if (nextIndex >= 0) {
        const nextOption = normalizedOptions[nextIndex];
        if (nextOption && !nextOption.disabled && !disabled) {
          handleSelect(nextOption.value);
          const targetEl = document.getElementById(
            `${generatedId}-opt-${nextOption.value}`,
          );
          targetEl?.focus();
        }
      }
    };

    return (
      <div
        ref={ref}
        role="radiogroup"
        aria-label={ariaLabel || 'Options'}
        aria-disabled={disabled}
        className={cn(
          'border border-line-strong rounded-ds-md overflow-hidden bg-surface',
          fullWidth ? 'flex w-full' : 'inline-flex',
          disabled && 'opacity-50 cursor-not-allowed',
          className,
        )}
        {...props}
      >
        {normalizedOptions.map((opt, idx) => {
          const isSelected = currentValue === opt.value;
          const isOptDisabled = disabled || Boolean(opt.disabled);
          const optId = `${generatedId}-opt-${opt.value}`;

          return (
            <button
              key={opt.value}
              id={optId}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-disabled={isOptDisabled}
              disabled={isOptDisabled}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => handleSelect(opt.value, opt.disabled)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={cn(
                'inline-flex items-center justify-center gap-space-6 h-control-md px-space-12 font-text font-bold text-label select-none transition-colors duration-fast',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset',
                fullWidth && 'flex-1',
                isSelected
                  ? 'bg-brand text-on-brand'
                  : 'text-ink-3 hover:text-ink hover:bg-hover active:bg-pressed',
                isOptDisabled && 'cursor-not-allowed text-ink-faint',
              )}
            >
              {opt.icon ? (
                <span className="shrink-0 flex items-center">{opt.icon}</span>
              ) : null}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  },
);

SegmentedControl.displayName = 'SegmentedControl';
