import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import React, { forwardRef } from 'react';

import { cn } from '../cn';

export interface MenuItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onSelect'> {
  icon?: React.ReactNode;
  hint?: React.ReactNode;
  destructive?: boolean;
  active?: boolean;
  action?: boolean;
  onSelect?: () => void;
}

export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(
  (
    {
      children,
      icon,
      hint,
      destructive = false,
      active = false,
      action = false,
      disabled = false,
      onSelect,
      onClick,
      className,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      onClick?.(e);
      onSelect?.();
    };

    return (
      <button
        ref={ref}
        type={type}
        role="menuitem"
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          'flex items-center gap-space-10 w-full text-left py-space-8 px-space-10 rounded-ds-md font-text font-semibold text-body select-none transition-colors duration-fast outline-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
          !disabled && !destructive && !active && !action && 'text-ink hover:bg-hover focus-visible:bg-hover cursor-pointer',
          !disabled && active && 'bg-brand-tint text-brand-strong hover:bg-brand-tint cursor-pointer',
          !disabled && destructive && 'text-danger hover:bg-danger-tint focus-visible:bg-danger-tint cursor-pointer',
          !disabled && action && 'text-brand font-bold hover:bg-hover focus-visible:bg-hover cursor-pointer',
          disabled && 'text-ink-faint cursor-not-allowed opacity-60',
          className,
        )}
        {...props}
      >
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
      </button>
    );
  },
);

MenuItem.displayName = 'MenuItem';

export interface MenuSeparatorProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const MenuSeparator = forwardRef<HTMLDivElement, MenuSeparatorProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="separator"
        className={cn('h-px bg-line-soft my-space-4 mx-space-6', className)}
        {...props}
      />
    );
  },
);

MenuSeparator.displayName = 'MenuSeparator';

export interface MenuGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
}

export const MenuGroup = forwardRef<HTMLDivElement, MenuGroupProps>(
  ({ label, className, children, ...props }, ref) => {
    return (
      <div ref={ref} role="group" className={cn('flex flex-col', className)} {...props}>
        {label ? (
          <div className="font-text text-overline font-extrabold uppercase text-ink-4 px-space-10 pt-space-8 pb-space-4 select-none">
            {label}
          </div>
        ) : null}
        {children}
      </div>
    );
  },
);

MenuGroup.displayName = 'MenuGroup';

export interface MenuProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Menu = forwardRef<HTMLDivElement, MenuProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="menu"
        className={cn(
          'bg-surface border border-line rounded-ds-lg shadow-pop p-space-6 flex flex-col w-full min-w-0',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Menu.displayName = 'Menu';

/* ---------- DropdownMenu Primitives (Floating Menu) ---------- */

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

export interface DropdownMenuContentProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> {}

export const DropdownMenuContent = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  DropdownMenuContentProps
>(({ className, sideOffset = 4, ...props }, ref) => {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'z-sticky bg-surface border border-line rounded-ds-lg shadow-pop p-space-6 flex flex-col min-w-0 outline-none',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
});

DropdownMenuContent.displayName = 'DropdownMenuContent';

export interface DropdownMenuItemProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
  icon?: React.ReactNode;
  hint?: React.ReactNode;
  destructive?: boolean;
  active?: boolean;
  action?: boolean;
}

export const DropdownMenuItem = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  DropdownMenuItemProps
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
      ...props
    },
    ref,
  ) => {
    return (
      <DropdownMenuPrimitive.Item
        ref={ref}
        disabled={disabled}
        className={cn(
          'flex items-center gap-space-10 w-full text-left py-space-8 px-space-10 rounded-ds-md font-text font-semibold text-body select-none transition-colors duration-fast outline-none',
          !disabled && !destructive && !active && !action && 'text-ink hover:bg-hover focus-visible:bg-hover cursor-pointer',
          !disabled && active && 'bg-brand-tint text-brand-strong hover:bg-brand-tint cursor-pointer',
          !disabled && destructive && 'text-danger hover:bg-danger-tint focus-visible:bg-danger-tint cursor-pointer',
          !disabled && action && 'text-brand font-bold hover:bg-hover focus-visible:bg-hover cursor-pointer',
          disabled && 'text-ink-faint cursor-not-allowed opacity-60',
          className,
        )}
        {...props}
      >
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
      </DropdownMenuPrimitive.Item>
    );
  },
);

DropdownMenuItem.displayName = 'DropdownMenuItem';

export interface DropdownMenuSeparatorProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator> {}

export const DropdownMenuSeparator = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  DropdownMenuSeparatorProps
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('h-px bg-line-soft my-space-4 mx-space-6', className)}
    {...props}
  />
));

DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

export interface DropdownMenuLabelProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> {}

export const DropdownMenuLabel = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  DropdownMenuLabelProps
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

DropdownMenuLabel.displayName = 'DropdownMenuLabel';
