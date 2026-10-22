'use client';

import React, { forwardRef, useCallback, useRef } from 'react';

import { cn } from '../cn';
import { useControllableState } from '../useControllableState';
import { useSlidingIndicator } from '../useSlidingIndicator';

export type SegmentedControlSize = 'md' | 'lg' | 'xl';

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
  /** Height, with TextField's size names: md and lg are control-md, xl is control-xl */
  size?: SegmentedControlSize;
  disabled?: boolean;
}

const Impl = (
  {
    options,
    value: controlledValue,
    defaultValue,
    onValueChange,
    fullWidth = false,
    size = 'md',
    disabled = false,
    className,
    'aria-label': ariaLabel,
    ...props
  }: SegmentedControlProps<string>,
  ref: React.ForwardedRef<HTMLDivElement>,
) => {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const groupRef = useRef<HTMLDivElement | null>(null);
  const setGroupRef = useCallback(
    (node: HTMLDivElement | null) => {
      groupRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  const { rect, animated } = useSlidingIndicator(groupRef, '[role="radio"][aria-checked="true"]', ['aria-checked']);

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
      ref={setGroupRef}
      role="radiogroup"
      aria-label={ariaLabel || 'Options'}
      aria-disabled={disabled}
      className={cn(
        'relative border border-line-strong rounded-ds-md overflow-hidden bg-surface',
        fullWidth ? 'flex w-full' : 'inline-flex',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      {...props}
    >
      {rect ? (
        <span
          aria-hidden="true"
          data-segmented-thumb=""
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 bg-brand',
            animated && 'transition-all duration-base motion-reduce:transition-none',
          )}
          style={{ width: rect.width, transform: `translateX(${rect.left}px)` }}
        />
      ) : null}
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
              'relative inline-flex items-center justify-center gap-space-6 px-space-12 font-text font-bold text-label select-none transition-colors duration-fast',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset',
              size === 'xl' ? 'h-control-xl' : 'h-control-md',
              fullWidth && 'flex-1',
              isSelected
                ? cn('text-on-brand', !rect && 'bg-brand')
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
