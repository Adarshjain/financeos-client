'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { useControllableState } from '../useControllableState';

export interface TooltipProps {
  /** Short plain-text label. */
  content: string;
  /** The element the tooltip describes. Wrapped with `Trigger asChild`. */
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export const Tooltip = forwardRef<HTMLElement, TooltipProps>(
  (
    {
      content,
      children,
      side = 'top',
      align = 'center',
      delayDuration = 300,
      open,
      defaultOpen,
      onOpenChange,
      className,
    },
    ref,
  ) => {
    const [isOpen, setOpen] = useControllableState<boolean>({
      value: open,
      defaultValue: defaultOpen ?? false,
      onChange: onOpenChange,
    });

    return (
      <TooltipPrimitive.Provider delayDuration={delayDuration}>
        <TooltipPrimitive.Root open={isOpen} onOpenChange={setOpen}>
          <TooltipPrimitive.Trigger asChild ref={ref as React.Ref<HTMLButtonElement>}>
            {children}
          </TooltipPrimitive.Trigger>
          <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
              side={side}
              align={align}
              sideOffset={4}
              className={cn(
                'max-desk:hidden z-overlay bg-brand text-on-brand rounded-ds-sm px-space-8 py-space-4',
                'font-text text-caption max-w-container-sm',
                'animate-in fade-in-0 duration-fast',
                className,
              )}
            >
              {content}
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
      </TooltipPrimitive.Provider>
    );
  },
);

Tooltip.displayName = 'Tooltip';
