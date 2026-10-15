import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import React, { forwardRef, useState } from 'react';

import { cn } from '../cn';
import { Icon } from '../Icon/Icon';

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
    const isControlled = controlledChecked !== undefined;
    const [internalChecked, setInternalChecked] =
      useState<CheckboxPrimitive.CheckedState>(defaultChecked);
    const rawChecked = isControlled ? controlledChecked : internalChecked;
    const checkedState: CheckboxPrimitive.CheckedState = indeterminate
      ? 'indeterminate'
      : rawChecked;
    const isActive = checkedState === true || checkedState === 'indeterminate';

    const handleCheckedChange = (state: CheckboxPrimitive.CheckedState) => {
      if (!isControlled) {
        setInternalChecked(state);
      }
      onCheckedChange?.(state);
    };

    return (
      <CheckboxPrimitive.Root
        ref={ref}
        checked={checkedState}
        onCheckedChange={handleCheckedChange}
        className={cn(
          'peer shrink-0 inline-flex items-center justify-center w-space-16 h-space-16 rounded-ds-xs border-2 text-on-brand transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isActive
            ? 'bg-brand border-brand'
            : 'bg-surface border-line-strong',
          className,
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
          {checkedState === 'indeterminate' ? (
            <Icon icon={Minus} size="sm" />
          ) : (
            <Icon icon={Check} size="sm" />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );
  },
);

Checkbox.displayName = 'Checkbox';
