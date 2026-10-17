'use client';

import React, { forwardRef, useRef } from 'react';

import { cn } from '../cn';
import { useControllableState } from '../useControllableState';

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
  onValueChange?: (value: T) => void;
  fullWidth?: boolean;
  disabled?: boolean;
}

const Impl = (
  {
    options,
    value: controlledValue,
    defaultValue,
    onValueChange,
    fullWidth = false,
    disabled = false,
    className,
    'aria-label': ariaLabel,
    ...props
  }: SegmentedControlProps<string>,
  ref: React.ForwardedRef<HTMLDivElement>,
) => {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const normalizedOptions: SegmentedControlOption<string>[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt,
  );

  const [currentValue, setCurrentValue] = useControllableState<string | undefined>({
    value: controlledValue,
    defaultValue,
    onChange: onValueChange ? (v) => { if (v !== undefined) onValueChange(v); } : undefined,
  });

  const handleSelect = (val: string, optDisabled?: boolean) => {
    if (disabled || optDisabled) return;
    setCurrentValue(val);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (disabled || normalizedOptions.length === 0) return;

    let step = 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      step = 1;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      step = -1;
    }

    if (step === 0) return;
    e.preventDefault();

    const count = normalizedOptions.length;
    let candidate = (index + step + count) % count;
    let foundIndex = -1;

    for (let i = 0; i < count; i++) {
      if (!normalizedOptions[candidate]?.disabled) {
        foundIndex = candidate;
        break;
      }
      candidate = (candidate + step + count) % count;
    }

    if (foundIndex >= 0 && foundIndex !== index) {
      const nextOption = normalizedOptions[foundIndex];
      if (nextOption) {
        handleSelect(nextOption.value);
        itemRefs.current[foundIndex]?.focus();
      }
    }
  };

  const hasSelection = normalizedOptions.some((opt) => opt.value === currentValue);

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
        const isTabbable = isSelected || (!hasSelection && idx === 0);

        return (
          <button
            key={opt.value}
            ref={(el) => {
              itemRefs.current[idx] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-disabled={isOptDisabled}
            disabled={isOptDisabled}
            tabIndex={isTabbable ? 0 : -1}
            onClick={() => handleSelect(opt.value, opt.disabled)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={cn(
              'inline-flex items-center justify-center gap-space-6 h-control-md px-space-12 font-text font-bold text-label select-none transition-colors duration-fast',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset',
              fullWidth && 'flex-1',
              isSelected
                ? 'bg-brand text-on-brand'
                : isOptDisabled
                  ? 'text-ink-faint'
                  : 'text-ink-3 hover:text-ink hover:bg-hover active:bg-pressed',
              isOptDisabled && 'cursor-not-allowed',
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
};

export const SegmentedControl = forwardRef(Impl) as (<T extends string = string>(
  p: SegmentedControlProps<T> & { ref?: React.Ref<HTMLDivElement> },
) => React.ReactElement) & { displayName?: string };

SegmentedControl.displayName = 'SegmentedControl';
