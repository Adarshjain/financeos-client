'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import { useControllableState } from '../useControllableState';

export interface CheckboxProps
  extends Omit<React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, 'onChange'> {
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(
  (
    {
      className,
      checked: controlledChecked,
      defaultChecked = false,
      indeterminate = false,
      onCheckedChange,
      ...props
    },
    ref,
  ) => {
    const [rawChecked, setRawChecked] =
      useControllableState<CheckboxPrimitive.CheckedState>({
        value: controlledChecked,
        defaultValue: defaultChecked,
        onChange: onCheckedChange,
      });
    const checkedState: CheckboxPrimitive.CheckedState = indeterminate
      ? 'indeterminate'
      : rawChecked;
    const isActive = checkedState === true || checkedState === 'indeterminate';

    return (
      <CheckboxPrimitive.Root
        ref={ref}
        checked={checkedState}
        onCheckedChange={setRawChecked}
        className={cn(
          'peer shrink-0 inline-flex items-center justify-center align-middle w-space-16 h-space-16 rounded-ds-xs border-2 text-on-brand transition-colors select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isActive
            ? 'bg-brand border-brand hover:bg-brand-hover hover:border-brand-hover active:bg-brand-pressed active:border-brand-pressed'
            : 'bg-surface border-line-strong hover:bg-hover active:bg-pressed',
          className,
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
          {checkedState === 'indeterminate' ? (
            <Icon name="close" size="sm" />
          ) : (
            <Icon name="check" size="sm" />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );
  },
);

Checkbox.displayName = 'Checkbox';
