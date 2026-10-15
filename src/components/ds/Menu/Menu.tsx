import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import React, { forwardRef, useMemo, useState } from 'react';

import { cn } from '../cn';
import { Dialog, DialogBody, DialogContent } from '../Dialog/Dialog';
import { getItemRowClass, ItemRowStyleOptions } from '../itemRow';
import { useIsPhone } from '../useMediaQuery';

const MenuContext = React.createContext<{
  isDialog: boolean;
  close: () => void;
}>({ isDialog: false, close: () => {} });

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;
export const DropdownMenuSubTrigger = DropdownMenuPrimitive.SubTrigger;
export const DropdownMenuSubContent = DropdownMenuPrimitive.SubContent;

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
>(({ className, sideOffset = 4, children, ...props }, ref) => {
  const { isDialog } = React.useContext(MenuContext);

  if (isDialog) {
    return <div className={cn('flex flex-col', className)}>{children}</div>;
  }

  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'z-overlay bg-surface border border-line rounded-ds-lg shadow-pop p-space-6 flex flex-col min-w-menu-trigger outline-none',
          'animate-in fade-in-0 slide-in-from-top-1 duration-base',
          className,
        )}
        {...props}
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
});

MenuContent.displayName = 'MenuContent';
export const DropdownMenuContent = MenuContent;

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
      className,
      onClick,
      onSelect,
      ...props
    },
    ref,
  ) => {
    const { isDialog, close } = React.useContext(MenuContext);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      onClick?.(e);
      if (isDialog) {
        onSelect?.(e as unknown as Event);
        close();
      }
    };

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
              'ml-auto font-text font-semibold text-caption shrink-0 pl-space-6',
              active ? 'text-brand-strong' : 'text-ink-4',
            )}
          >
            {hint}
          </span>
        ) : null}
      </>
    );

    if (isDialog) {
      return (
        <div
          ref={ref as unknown as React.Ref<HTMLDivElement>}
          role="menuitem"
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? -1 : 0}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick(e as unknown as React.MouseEvent<HTMLDivElement>);
            }
          }}
          className={cn(rowClass, 'cursor-pointer select-none')}
          {...props}
        >
          {content}
        </div>
      );
    }

    return (
      <DropdownMenuPrimitive.Item
        ref={ref}
        disabled={disabled}
        className={rowClass}
        onClick={onClick}
        onSelect={onSelect}
        {...props}
      >
        {content}
      </DropdownMenuPrimitive.Item>
    );
  },
);

MenuItem.displayName = 'MenuItem';
export const DropdownMenuItem = MenuItem;

export interface MenuSeparatorProps
  extends React.ComponentPropsWithoutRef<
    typeof DropdownMenuPrimitive.Separator
  > {}

export const MenuSeparator = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  MenuSeparatorProps
>(({ className, ...props }, ref) => {
  const { isDialog } = React.useContext(MenuContext);
  if (isDialog) {
    return (
      <div
        ref={ref as unknown as React.Ref<HTMLDivElement>}
        role="separator"
        className={cn('h-px bg-line-soft my-space-4 mx-space-6', className)}
        {...props}
      />
    );
  }
  return (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      className={cn('h-px bg-line-soft my-space-4 mx-space-6', className)}
      {...props}
    />
  );
});

MenuSeparator.displayName = 'MenuSeparator';
export const DropdownMenuSeparator = MenuSeparator;

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
export const DropdownMenuGroupWrapper = MenuGroup;

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
export const DropdownMenuLabel = MenuLabel;

export interface MenuProps extends DropdownMenuPrimitive.DropdownMenuProps {
  trigger?: React.ReactNode;
  children?: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  contentClassName?: string;
  forcePhone?: boolean;
  title?: string;
}

export const Menu: React.FC<MenuProps> & {
  Root: typeof DropdownMenuPrimitive.Root;
  Trigger: typeof DropdownMenuPrimitive.Trigger;
  Content: typeof MenuContent;
  Item: typeof MenuItem;
  Separator: typeof MenuSeparator;
  Group: typeof MenuGroup;
  Label: typeof MenuLabel;
} = ({
  trigger,
  children,
  align = 'start',
  side = 'bottom',
  sideOffset = 4,
  contentClassName,
  open,
  defaultOpen,
  onOpenChange,
  modal,
  dir,
  forcePhone,
  title,
}) => {
  const isPhoneDevice = useIsPhone();
  const isPhone = forcePhone !== undefined ? forcePhone : isPhoneDevice;

  const itemCount = useMemo(() => {
    let count = 0;
    const walk = (node: React.ReactNode) => {
      React.Children.forEach(node, (child) => {
        if (!React.isValidElement(child)) return;
        if (
          child.type === MenuItem ||
          child.type === DropdownMenuItem ||
          (child.props as { role?: string })?.role === 'menuitem'
        ) {
          count++;
        } else if ((child.props as { children?: React.ReactNode })?.children) {
          walk((child.props as { children?: React.ReactNode }).children);
        }
      });
    };
    walk(children);
    return count;
  }, [children]);

  const showDialog = isPhone && itemCount > 6;
  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setOpen = (next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  if (showDialog) {
    return (
      <MenuContext.Provider
        value={{ isDialog: true, close: () => setOpen(false) }}
      >
        <Dialog open={isOpen} onOpenChange={setOpen}>
          {trigger ? (
            <div
              onClick={() => setOpen(!isOpen)}
              className="inline-block cursor-pointer"
            >
              {trigger}
            </div>
          ) : null}
          <DialogContent
            title={title || 'Menu'}
            onClose={() => setOpen(false)}
            className="max-h-dvh"
          >
            <DialogBody className="p-space-8 flex flex-col gap-space-2">
              {children}
            </DialogBody>
          </DialogContent>
        </Dialog>
      </MenuContext.Provider>
    );
  }

  if (trigger) {
    return (
      <DropdownMenuPrimitive.Root
        open={isOpen}
        defaultOpen={defaultOpen}
        onOpenChange={setOpen}
        modal={modal}
        dir={dir}
      >
        <DropdownMenuPrimitive.Trigger asChild>
          {trigger}
        </DropdownMenuPrimitive.Trigger>
        <MenuContent
          align={align}
          side={side}
          sideOffset={sideOffset}
          className={contentClassName}
        >
          {children}
        </MenuContent>
      </DropdownMenuPrimitive.Root>
    );
  }

  return (
    <DropdownMenuPrimitive.Root
      open={isOpen}
      defaultOpen={defaultOpen}
      onOpenChange={setOpen}
      modal={modal}
      dir={dir}
    >
      {children}
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
