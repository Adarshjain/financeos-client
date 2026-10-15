'use client';

import React, { forwardRef, useId } from 'react';

import { cn } from '../cn';
import { useControllableState } from '../useControllableState';

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  borderTop?: boolean;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      id: explicitId,
      checked: controlledChecked,
      defaultChecked = false,
      onCheckedChange,
      label,
      description,
      error,
      borderTop = false,
      disabled = false,
      className,
      'aria-label': ariaLabel,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = explicitId || generatedId;
    const descId = `${id}-desc`;
    const errId = `${id}-err`;

    const [isChecked, setIsChecked] = useControllableState<boolean>({
      value: controlledChecked,
      defaultValue: defaultChecked,
      onChange: onCheckedChange,
    });

    const handleClick = () => {
      if (disabled) return;
      setIsChecked(!isChecked);
    };

    const switchButton = (
      <button
        ref={ref}
        id={id}
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-disabled={disabled}
        aria-label={ariaLabel || (label ? undefined : 'Toggle')}
        aria-describedby={
          error ? errId : description ? descId : undefined
        }
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          'relative inline-flex shrink-0 items-center w-control-lg h-space-20 rounded-ds-pill p-space-2 transition-colors duration-fast',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
          isChecked
            ? 'bg-brand hover:bg-brand-hover active:bg-brand-pressed'
            : 'bg-line-handle hover:bg-line-strong active:bg-line-strong',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          !label && !description && className,
        )}
        {...props}
      >
        <span
          className={cn(
            'pointer-events-none block w-space-16 h-space-16 rounded-ds-pill bg-surface shadow-pop transition-transform duration-fast',
            isChecked ? 'translate-x-space-16' : 'translate-x-0',
          )}
        />
      </button>
    );

    if (!label && !description && !error) {
      return switchButton;
    }

    return (
      <div
        className={cn(
          'flex items-center justify-between gap-space-12 py-space-10 font-text',
          borderTop && 'border-t border-line-soft',
          className,
        )}
      >
        <div className="flex-1 min-w-0 pr-space-8">
          {label ? (
            <label
              htmlFor={id}
              className={cn(
                'block font-text font-semibold text-body select-none',
                disabled ? 'text-ink-3 cursor-not-allowed' : 'text-ink cursor-pointer',
              )}
            >
              {label}
            </label>
          ) : null}
          {description ? (
            <div
              id={descId}
              className="font-text font-medium text-caption text-ink-3 mt-space-2 select-none"
            >
              {description}
            </div>
          ) : null}
          {error ? (
            <div
              id={errId}
              className="font-text font-medium text-caption text-danger mt-space-4"
            >
              {error}
            </div>
          ) : null}
        </div>
        {switchButton}
      </div>
    );
  },
);

Switch.displayName = 'Switch';
