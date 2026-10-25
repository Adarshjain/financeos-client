'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import React, { forwardRef } from 'react';

import { guardCloseAutoFocus } from '../closeAutoFocus';
import { cn } from '../cn';
import { getItemRowClass, ItemRowStyleOptions } from '../itemRow';
import { useControllableState } from '../useControllableState';

export const MenuRoot = DropdownMenuPrimitive.Root;
export const MenuTrigger = DropdownMenuPrimitive.Trigger;
export const MenuPortal = DropdownMenuPrimitive.Portal;
export const MenuRadioGroup = DropdownMenuPrimitive.RadioGroup;
export const MenuSub = DropdownMenuPrimitive.Sub;
export const MenuSubTrigger = DropdownMenuPrimitive.SubTrigger;
export const MenuSubContent = DropdownMenuPrimitive.SubContent;

export interface MenuContentProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> {
  sideOffset?: number;
}

export const MenuContent = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  MenuContentProps
>(({ className, sideOffset = 4, children, onCloseAutoFocus, ...props }, ref) => {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'z-overlay bg-surface border border-line rounded-ds-lg shadow-level-2 p-space-6 flex flex-col min-w-menu-trigger outline-none font-text',
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
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onSelect?: (e: Event) => void;
}

export const MenuItem = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  MenuItemProps
>(
  (
    {
      children,
      icon,
      hint,
      destructive = false,
      active = false,
      action = false,
      disabled = false,
      asChild = false,
      className,
      onClick,
      onSelect,
      ...props
    },
    ref,
  ) => {
    const rowClass = getItemRowClass({
      active,
      destructive,
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
        onClick={onClick}
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

export const MenuSeparator = forwardRef<
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

export const MenuGroup = forwardRef<
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

export const MenuLabel = forwardRef<
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

export const Menu: React.FC<MenuProps> & {
  Root: typeof DropdownMenuPrimitive.Root;
  Trigger: typeof DropdownMenuPrimitive.Trigger;
  Content: typeof MenuContent;
  Item: typeof MenuItem;
  Separator: typeof MenuSeparator;
  Group: typeof MenuGroup;
  Label: typeof MenuLabel;
  Portal: typeof DropdownMenuPrimitive.Portal;
  RadioGroup: typeof DropdownMenuPrimitive.RadioGroup;
  Sub: typeof DropdownMenuPrimitive.Sub;
  SubTrigger: typeof DropdownMenuPrimitive.SubTrigger;
  SubContent: typeof DropdownMenuPrimitive.SubContent;
} = ({
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
        <DropdownMenuPrimitive.Trigger asChild>
          {trigger}
        </DropdownMenuPrimitive.Trigger>
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

Menu.displayName = 'Menu';
Menu.Root = DropdownMenuPrimitive.Root;
Menu.Trigger = DropdownMenuPrimitive.Trigger;
Menu.Content = MenuContent;
Menu.Item = MenuItem;
Menu.Separator = MenuSeparator;
Menu.Group = MenuGroup;
Menu.Label = MenuLabel;
Menu.Portal = DropdownMenuPrimitive.Portal;
Menu.RadioGroup = DropdownMenuPrimitive.RadioGroup;
Menu.Sub = DropdownMenuPrimitive.Sub;
Menu.SubTrigger = DropdownMenuPrimitive.SubTrigger;
Menu.SubContent = DropdownMenuPrimitive.SubContent;
