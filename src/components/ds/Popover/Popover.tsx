'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import React, { forwardRef } from 'react';

import { guardCloseAutoFocus } from '../closeAutoFocus';
import { cn } from '../cn';
import { useControllableState } from '../useControllableState';

/** Gap kept to the viewport edge on each side. Mirrors the space-20 step (20px) used by container-viewport-inset; there is no JS token export to derive it from. */
const VIEWPORT_GUTTER = 20;

const PopoverRoot = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverPortal = PopoverPrimitive.Portal;
const PopoverClose = PopoverPrimitive.Close;
const PopoverAnchor = PopoverPrimitive.Anchor;

export interface PopoverContentProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {
  /** The panel is a list of choices (owner, 2026-10-26): container-xs wide, grows to its content, capped at the viewport inset, never tied to the trigger. */
  list?: boolean;
}

/** Width rule shared by every dropdown list. */
export const LIST_WIDTH_CLASS =
  'w-max min-w-container-xs max-w-container-viewport-inset desk:max-w-container-viewport-inset';

const PopoverContent = forwardRef<
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
      collisionPadding = VIEWPORT_GUTTER,
      onCloseAutoFocus,
      list = false,
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
          collisionPadding={collisionPadding}
          className={cn(
            'z-overlay bg-surface border border-line rounded-ds-lg shadow-level-2 p-space-4 flex flex-col outline-none font-text',
            'animate-in fade-in-0 data-side-bottom:slide-in-from-top-1 data-side-top:slide-in-from-bottom-1 duration-base',
            'data-closed:animate-out data-closed:fade-out-0 data-closed:fill-mode-forwards data-closed:duration-fast data-closed:data-side-bottom:slide-out-to-top-1 data-closed:data-side-top:slide-out-to-bottom-1',
            'min-w-popover-trigger max-w-container-viewport-inset desk:max-w-container-sm w-auto',
            list && LIST_WIDTH_CLASS,
            className,
          )}
          {...props}
          onCloseAutoFocus={guardCloseAutoFocus(onCloseAutoFocus)}
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
  /** Panel is a list of choices: see PopoverContentProps.list. */
  list?: boolean;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  contentProps?: Omit<PopoverContentProps, 'align' | 'side' | 'sideOffset' | 'className'>;
}

const PopoverImpl: React.FC<PopoverProps> = ({
  trigger,
  children,
  contentClassName,
  list,
  align = 'start',
  side = 'bottom',
  sideOffset = 4,
  contentProps,
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

  if (process.env.NODE_ENV !== 'production') {
    if (!trigger && contentClassName) {
      console.warn(
        'Popover: `contentClassName` was passed without a `trigger`. When using Popover as a composition root, pass className directly to `Popover.Content`.',
      );
    }
  }

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
          list={list}
          {...contentProps}
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

PopoverImpl.displayName = 'Popover';

export const Popover = Object.assign(PopoverImpl, {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Content: PopoverContent,
  Portal: PopoverPortal,
  Close: PopoverClose,
  Anchor: PopoverAnchor,
});
