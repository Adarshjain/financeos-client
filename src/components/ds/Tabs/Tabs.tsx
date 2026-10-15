'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import React, { createContext, forwardRef, useContext } from 'react';

import { cn } from '../cn';
import { useControllableState } from '../useControllableState';

export interface TabItem {
  value: string;
  label: React.ReactNode;
  count?: number | string;
  disabled?: boolean;
}

interface TabsContextValue {
  value?: string;
  onValueChange?: (val: string) => void;
}

const TabsContext = createContext<TabsContextValue>({});

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
      <TabsContext.Provider
        value={{ value: activeValue, onValueChange: setActiveValue }}
      >
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
      </TabsContext.Provider>
    );
  },
);

Tabs.displayName = 'Tabs';

export const TabsList = forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, onKeyDown, ...props }, ref) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;

    const tabs = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>(
        'button[role="tab"]:not([disabled])',
      ),
    );
    if (!tabs.length) return;

    const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);

    let nextIndex = -1;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = tabs.length - 1;
    }

    if (nextIndex >= 0) {
      tabs[nextIndex].focus();
      tabs[nextIndex].click();
    }
  };

  return (
    <TabsPrimitive.List
      ref={ref}
      onKeyDown={handleKeyDown}
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
>(({ className, children, count, value, disabled, onClick, ...props }, ref) => {
  const { value: activeValue, onValueChange } = useContext(TabsContext);
  const isActive = activeValue === value;

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      disabled={disabled}
      onClick={(e) => {
        onClick?.(e);
        if (!disabled && onValueChange) {
          onValueChange(value);
        }
      }}
      className={cn(
        'font-text text-body py-space-10 px-space-12 whitespace-nowrap border-b-2 rounded-none -mb-px transition-colors duration-fast select-none cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset',
        isActive
          ? 'text-brand-strong border-brand font-bold'
          : 'font-semibold text-ink-3 border-transparent hover:text-ink hover:bg-hover active:bg-pressed',
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
    className={cn('outline-none py-space-12', className)}
    {...props}
  />
));

TabsContent.displayName = 'TabsContent';
