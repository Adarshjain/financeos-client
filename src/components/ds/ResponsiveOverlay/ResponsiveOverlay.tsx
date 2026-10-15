'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import React, { createContext, useContext } from 'react';

import { cn } from '../cn';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from '../Dialog/Dialog';
import {
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from '../Popover/Popover';
import { useControllableState } from '../useControllableState';
import { useIsPhone } from '../useMediaQuery';

export interface ResponsiveOverlayContextValue {
  isSheet: boolean;
  close: () => void;
}

export const ResponsiveOverlayContext = createContext<ResponsiveOverlayContextValue>({
  isSheet: false,
  close: () => {},
});

export const useResponsiveOverlay = () => useContext(ResponsiveOverlayContext);

export interface ResponsiveOverlayProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  popoverContentClassName?: string;
  dialogContentClassName?: string;
  dialogBodyClassName?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  modal?: boolean;
  /**
   * When true, stays as popover even on phone (e.g. short menus with <= 6 items).
   */
  forcePopover?: boolean;
  /**
   * When true, forces sheet representation (e.g. testing phone viewport).
   */
  forceSheet?: boolean;
  /**
   * Use Radix DropdownMenu on desktop for menu item keyboard semantics.
   */
  asDropdownMenu?: boolean;
}

/**
 * ResponsiveOverlay: single piece that switches between a floating Popover
 * from lg up, and a bottom-sheet Dialog below it. Select, Menu, and DateField
 * open through it.
 */
export const ResponsiveOverlay: React.FC<ResponsiveOverlayProps> = ({
  open,
  defaultOpen = false,
  onOpenChange,
  trigger,
  title,
  footer,
  children,
  popoverContentClassName,
  dialogContentClassName,
  dialogBodyClassName,
  align = 'start',
  side = 'bottom',
  sideOffset = 4,
  modal,
  forcePopover = false,
  forceSheet = false,
  asDropdownMenu = false,
}) => {
  const [isOpen, setOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen ?? false,
    onChange: onOpenChange,
  });

  const isPhone = useIsPhone();
  const isSheet = (isPhone || forceSheet) && !forcePopover;

  const contextValue: ResponsiveOverlayContextValue = {
    isSheet,
    close: () => setOpen(false),
  };

  if (isSheet) {
    return (
      <ResponsiveOverlayContext.Provider value={contextValue}>
        <Dialog open={isOpen} onOpenChange={setOpen}>
          {trigger ? (
            <DialogTrigger asChild>{trigger}</DialogTrigger>
          ) : null}
          <DialogContent
            title={title}
            onClose={() => setOpen(false)}
            className={cn('max-h-dvh', dialogContentClassName)}
          >
            <DialogBody className={dialogBodyClassName || 'p-0'}>
              {children}
            </DialogBody>
            {footer ? <DialogFooter>{footer}</DialogFooter> : null}
          </DialogContent>
        </Dialog>
      </ResponsiveOverlayContext.Provider>
    );
  }

  if (asDropdownMenu) {
    return (
      <ResponsiveOverlayContext.Provider value={contextValue}>
        <DropdownMenuPrimitive.Root
          open={isOpen}
          defaultOpen={defaultOpen}
          onOpenChange={setOpen}
          modal={modal}
        >
          {trigger ? (
            <DropdownMenuPrimitive.Trigger asChild>
              {trigger}
            </DropdownMenuPrimitive.Trigger>
          ) : null}
          <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content
              align={align}
              side={side}
              sideOffset={sideOffset}
              className={cn(
                'z-overlay bg-surface border border-line rounded-ds-lg shadow-pop p-space-4 flex flex-col outline-none',
                'animate-in fade-in-0 slide-in-from-top-1 duration-base',
                'min-w-menu-trigger max-w-dialog-sm w-auto',
                popoverContentClassName,
              )}
            >
              {children}
            </DropdownMenuPrimitive.Content>
          </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>
      </ResponsiveOverlayContext.Provider>
    );
  }

  return (
    <ResponsiveOverlayContext.Provider value={contextValue}>
      <PopoverRoot open={isOpen} onOpenChange={setOpen} modal={modal}>
        {trigger ? <PopoverTrigger asChild>{trigger}</PopoverTrigger> : null}
        <PopoverContent
          align={align}
          side={side}
          sideOffset={sideOffset}
          className={cn(
            'p-0 overflow-hidden shadow-pop min-w-popover-trigger max-w-dialog-sm w-auto',
            popoverContentClassName,
          )}
        >
          {children}
        </PopoverContent>
      </PopoverRoot>
    </ResponsiveOverlayContext.Provider>
  );
};

ResponsiveOverlay.displayName = 'ResponsiveOverlay';
