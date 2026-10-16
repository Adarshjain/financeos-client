'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { useControllableState } from '../useControllableState';

export const PopoverRoot = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverPortal = PopoverPrimitive.Portal;
export const PopoverClose = PopoverPrimitive.Close;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export interface PopoverContentProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {}

export const PopoverContent = forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(
  (
    {
      className,
      children,
      align = 'start',
      side = 'bottom',
      sideOffset = 4,
      ...props
    },
    ref,
  ) => {
    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={ref}
          align={align}
          side={side}
          sideOffset={sideOffset}
          className={cn(
            'z-overlay bg-surface border border-line rounded-ds-lg shadow-level-2 p-space-4 flex flex-col outline-none',
            'animate-in fade-in-0 slide-in-from-top-1 duration-base',
            'min-w-popover-trigger max-w-container-sm w-auto',
            className,
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    );
  },
);

PopoverContent.displayName = 'PopoverContent';

export interface PopoverProps extends PopoverPrimitive.PopoverProps {
  trigger?: React.ReactNode;
  children?: React.ReactNode;
  contentClassName?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
}

export const Popover: React.FC<PopoverProps> & {
  Root: typeof PopoverPrimitive.Root;
  Trigger: typeof PopoverPrimitive.Trigger;
  Content: typeof PopoverContent;
  Portal: typeof PopoverPrimitive.Portal;
  Close: typeof PopoverPrimitive.Close;
  Anchor: typeof PopoverPrimitive.Anchor;
} = ({
  trigger,
  children,
  contentClassName,
  align = 'start',
  side = 'bottom',
  sideOffset = 4,
  open,
  defaultOpen,
  onOpenChange,
  modal,
}) => {
  const [isOpen, setOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen ?? false,
    onChange: onOpenChange,
  });

  if (trigger) {
    return (
      <PopoverPrimitive.Root
        open={isOpen}
        onOpenChange={setOpen}
        modal={modal}
      >
        <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
        <PopoverContent
          align={align}
          side={side}
          sideOffset={sideOffset}
          className={contentClassName}
        >
          {children}
        </PopoverContent>
      </PopoverPrimitive.Root>
    );
  }

  return (
    <PopoverPrimitive.Root
      open={isOpen}
      onOpenChange={setOpen}
      modal={modal}
    >
      {children}
    </PopoverPrimitive.Root>
  );
};

Popover.displayName = 'Popover';
Popover.Root = PopoverPrimitive.Root;
Popover.Trigger = PopoverPrimitive.Trigger;
Popover.Content = PopoverContent;
Popover.Portal = PopoverPrimitive.Portal;
Popover.Close = PopoverPrimitive.Close;
Popover.Anchor = PopoverPrimitive.Anchor;
