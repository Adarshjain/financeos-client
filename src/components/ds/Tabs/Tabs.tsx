'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { useControllableState } from '../useControllableState';

export interface TabItem {
  value: string;
  label: React.ReactNode;
  count?: number | string;
  disabled?: boolean;
}

export interface TabsProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  items?: TabItem[];
}

export const Tabs = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  TabsProps
>(
  (
    {
      items,
      children,
      className,
      defaultValue,
      value: controlledValue,
      onValueChange,
      ...props
    },
    ref,
  ) => {
    const initialDefault =
      defaultValue ?? (items && items.length > 0 ? items[0].value : '');
    const [activeValue, setActiveValue] = useControllableState<string>({
      value: controlledValue,
      defaultValue: initialDefault,
      onChange: onValueChange,
    });

    return (
      <TabsPrimitive.Root
        ref={ref}
        value={activeValue}
        onValueChange={setActiveValue}
        className={cn('w-full', className)}
        {...props}
      >
        {items && items.length > 0 ? (
          <TabsList>
            {items.map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                count={item.count}
                disabled={item.disabled}
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        ) : null}
        {children}
      </TabsPrimitive.Root>
    );
  },
);

Tabs.displayName = 'Tabs';

export const TabsList = forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        'flex items-center gap-space-4 border-b border-line overflow-x-auto flex-nowrap scrollbar-none',
        className,
      )}
      {...props}
    />
  );
});

TabsList.displayName = 'TabsList';

export interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  count?: number | string;
}

export const TabsTrigger = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, children, count, disabled, ...props }, ref) => {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      disabled={disabled}
      className={cn(
        'font-text text-body py-space-10 px-space-12 whitespace-nowrap border-b-2 rounded-none -mb-px transition-colors duration-fast select-none cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset',
        'font-semibold text-ink-3 border-transparent hover:text-ink hover:bg-hover active:bg-pressed',
        'data-active:text-brand-strong data-active:border-brand data-active:font-bold data-active:hover:bg-transparent data-active:hover:text-brand-strong',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      {count !== undefined && count !== null ? (
        <span className="text-ink-3 font-medium"> · {count}</span>
      ) : null}
    </TabsPrimitive.Trigger>
  );
});

TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('outline-none', className)}
    {...props}
  />
));

TabsContent.displayName = 'TabsContent';
