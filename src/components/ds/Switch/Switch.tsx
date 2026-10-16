'use client';

import React, { forwardRef, useId } from 'react';

import { cn } from '../cn';
import { useControllableState } from '../useControllableState';

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
  value?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      id: explicitId,
      checked: controlledChecked,
      defaultChecked = false,
      onCheckedChange,
      disabled = false,
      name,
      value = 'on',
      className,
      onClick,
      'aria-label': ariaLabel,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = explicitId || generatedId;

    const [isChecked, setIsChecked] = useControllableState<boolean>({
      value: controlledChecked,
      defaultValue: defaultChecked,
      onChange: onCheckedChange,
    });

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (e.defaultPrevented || disabled) return;
      setIsChecked(!isChecked);
    };

    return (
      <>
        <button
          ref={ref}
          id={id}
          type="button"
          role="switch"
          aria-checked={isChecked}
          aria-disabled={disabled}
          aria-label={ariaLabel || 'Toggle'}
          disabled={disabled}
          onClick={handleClick}
          className={cn(
            'relative inline-flex shrink-0 items-center w-control-lg h-space-20 rounded-ds-pill p-space-2 transition-colors duration-fast',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
            isChecked
              ? 'bg-brand hover:bg-brand-hover active:bg-brand-pressed'
              : 'bg-line-heavy hover:bg-line-strong active:bg-line-strong',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            className,
          )}
          {...props}
        >
          <span
            className={cn(
              'pointer-events-none block w-space-16 h-space-16 rounded-ds-pill bg-surface shadow-level-2 transition-transform duration-fast',
              isChecked ? 'translate-x-space-16' : 'translate-x-0',
            )}
          />
        </button>
        {name ? (
          <input
            type="checkbox"
            name={name}
            value={value}
            checked={isChecked}
            onChange={() => {}}
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
            disabled={disabled}
          />
        ) : null}
      </>
    );
  },
);

Switch.displayName = 'Switch';
