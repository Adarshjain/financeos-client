'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import React, { forwardRef } from 'react';

import { guardCloseAutoFocus } from '../closeAutoFocus';
import { cn } from '../cn';
import { getItemRowClass, ItemRowStyleOptions } from '../itemRow';
import { useControllableState } from '../useControllableState';

const MenuRoot = DropdownMenuPrimitive.Root;
/**
 * Radix opens a dropdown on pointerdown, which fires the moment a finger lands, so a swipe that
 * starts on the trigger opens the menu instead of scrolling. For touch/pen the pointerdown is
 * cancelled (Radix skips its own open) and the menu opens on click, which only fires on a tap
 * released without scrolling. The click re-enters Radix's own mouse pointerdown path, so open
 * state stays owned by the root (controlled or not). Mouse and keyboard are unchanged.
 */
const MenuTrigger = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>(({ onPointerDown, onPointerCancel, onClick, disabled, ...props }, ref) => {
  const touchTap = React.useRef(false);
  const reopening = React.useRef(false);
  return (
    <DropdownMenuPrimitive.Trigger
      ref={ref}
      disabled={disabled}
      {...props}
      onPointerDown={(e) => {
        if (reopening.current) {
          // The re-dispatched pointerdown below only opens the menu: rows and other ancestors saw the
          // real one, so it must not start a second press there.
          e.stopPropagation();
          return;
        }
        onPointerDown?.(e);
        touchTap.current = false;
        if (e.pointerType === 'touch' || e.pointerType === 'pen') {
          touchTap.current = true;
          e.preventDefault();
        }
      }}
      onPointerCancel={(e) => {
        onPointerCancel?.(e);
        // The touch became a scroll: no click follows, so forget the tap.
        touchTap.current = false;
      }}
      onClick={(e) => {
        onClick?.(e);
        if (!touchTap.current) return;
        touchTap.current = false;
        if (e.defaultPrevented || disabled) return;
        const el = e.currentTarget;
        // Already open (closed by the outside-tap dismissal or not): leave it to Radix.
        if (el.getAttribute('data-state') === 'open') return;
        reopening.current = true;
        try {
          el.dispatchEvent(
            new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }),
          );
        } finally {
          reopening.current = false;
        }
      }}
    />
  );
});
MenuTrigger.displayName = 'MenuTrigger';
const MenuPortal = DropdownMenuPrimitive.Portal;
const MenuRadioGroup = DropdownMenuPrimitive.RadioGroup;
const MenuSub = DropdownMenuPrimitive.Sub;
const MenuSubTrigger = DropdownMenuPrimitive.SubTrigger;
const MenuSubContent = DropdownMenuPrimitive.SubContent;

export interface MenuContentProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> {
  sideOffset?: number;
}

const MenuContent = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  MenuContentProps
>(({ className, sideOffset = 4, children, onCloseAutoFocus, ...props }, ref) => {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'z-overlay bg-surface border border-line rounded-ds-lg shadow-level-2 p-space-6 flex flex-col w-max min-w-container-xs max-w-container-viewport-inset desk:max-w-container-viewport-inset outline-none font-text',
          'animate-in fade-in-0 data-side-bottom:slide-in-from-top-1 data-side-top:slide-in-from-bottom-1 duration-base',
          'data-closed:animate-out data-closed:fade-out-0 data-closed:fill-mode-forwards data-closed:duration-fast data-closed:data-side-bottom:slide-out-to-top-1 data-closed:data-side-top:slide-out-to-bottom-1',
          className,
        )}
        {...props}
        onCloseAutoFocus={guardCloseAutoFocus(onCloseAutoFocus)}
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
});

MenuContent.displayName = 'MenuContent';

export interface MenuItemProps
  extends Omit<
      React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>,
      'onClick' | 'onSelect'
    >,
    ItemRowStyleOptions {
  icon?: React.ReactNode;
  hint?: React.ReactNode;
  onSelect?: (e: Event) => void;
}

const MenuItem = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  MenuItemProps
>(
  (
    {
      children,
      icon,
      hint,
      tone = 'neutral',
      active = false,
      action = false,
      disabled = false,
      asChild = false,
      className,
      onSelect,
      ...props
    },
    ref,
  ) => {
    const rowClass = getItemRowClass({
      active,
      tone,
      action,
      disabled,
      className,
    });

    const content = (
      <>
        {icon ? (
          <span className="shrink-0 flex items-center text-current">{icon}</span>
        ) : null}
        <span className="flex-1 truncate">{children}</span>
        {hint ? (
          <span
            className={cn(
              'ml-auto font-text font-medium text-caption shrink-0 pl-space-6',
              active ? 'text-brand-strong' : 'text-ink-4',
            )}
          >
            {hint}
          </span>
        ) : null}
      </>
    );

    return (
      <DropdownMenuPrimitive.Item
        ref={ref}
        disabled={disabled}
        className={rowClass}
        onSelect={onSelect}
        asChild={asChild}
        {...props}
      >
        {asChild ? children : content}
      </DropdownMenuPrimitive.Item>
    );
  },
);

MenuItem.displayName = 'MenuItem';

export interface MenuSeparatorProps
  extends React.ComponentPropsWithoutRef<
    typeof DropdownMenuPrimitive.Separator
  > {}

const MenuSeparator = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  MenuSeparatorProps
>(({ className, ...props }, ref) => {
  return (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      className={cn('h-px bg-line-soft my-space-4 mx-space-6', className)}
      {...props}
    />
  );
});

MenuSeparator.displayName = 'MenuSeparator';

export interface MenuGroupProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Group> {
  label?: React.ReactNode;
}

const MenuGroup = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Group>,
  MenuGroupProps
>(({ label, className, children, ...props }, ref) => {
  return (
    <DropdownMenuPrimitive.Group
      ref={ref}
      className={cn('flex flex-col', className)}
      {...props}
    >
      {label ? (
        <DropdownMenuPrimitive.Label className="font-text text-overline font-extrabold uppercase text-ink-4 px-space-10 pt-space-8 pb-space-4 select-none">
          {label}
        </DropdownMenuPrimitive.Label>
      ) : null}
      {children}
    </DropdownMenuPrimitive.Group>
  );
});

MenuGroup.displayName = 'MenuGroup';

export interface MenuLabelProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> {}

const MenuLabel = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  MenuLabelProps
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      'font-text text-overline font-extrabold uppercase text-ink-4 px-space-10 pt-space-8 pb-space-4 select-none',
      className,
    )}
    {...props}
  />
));

MenuLabel.displayName = 'MenuLabel';

export interface MenuProps extends DropdownMenuPrimitive.DropdownMenuProps {
  trigger?: React.ReactNode;
  children?: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  contentClassName?: string;
  contentProps?: Omit<MenuContentProps, 'align' | 'side' | 'sideOffset' | 'className'>;
}

const MenuImpl: React.FC<MenuProps> = ({
  trigger,
  children,
  align = 'start',
  side = 'bottom',
  sideOffset = 4,
  contentClassName,
  contentProps,
  open,
  defaultOpen,
  onOpenChange,
  modal,
  dir,
}) => {
  const [isOpen, setOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen ?? false,
    onChange: onOpenChange,
  });

  return (
    <DropdownMenuPrimitive.Root
      open={isOpen}
      onOpenChange={setOpen}
      modal={modal}
      dir={dir}
    >
      {trigger && (
        <MenuTrigger asChild>{trigger}</MenuTrigger>
      )}
      <MenuContent
        align={align}
        side={side}
        sideOffset={sideOffset}
        className={contentClassName}
        {...contentProps}
      >
        {children}
      </MenuContent>
    </DropdownMenuPrimitive.Root>
  );
};

MenuImpl.displayName = 'Menu';

export const Menu = Object.assign(MenuImpl, {
  Root: MenuRoot,
  Trigger: MenuTrigger,
  Content: MenuContent,
  Item: MenuItem,
  Separator: MenuSeparator,
  Group: MenuGroup,
  Label: MenuLabel,
  Portal: MenuPortal,
  RadioGroup: MenuRadioGroup,
  Sub: MenuSub,
  SubTrigger: MenuSubTrigger,
  SubContent: MenuSubContent,
});
