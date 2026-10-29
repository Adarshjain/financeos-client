'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import React, { createContext, forwardRef, useContext, useRef } from 'react';

import { cn } from '../cn';
import { useControllableState } from '../useControllableState';
import { useSlidingIndicator } from '../useSlidingIndicator';

export interface TabItem {
  value: string;
  label: React.ReactNode;
  /** Shown after the label as "· 3". Leave it undefined while it loads; it appears when it arrives. */
  count?: number | string;
  disabled?: boolean;
  /** Render the tab as `children` (one link element, e.g. the app's `<Link href />`), so each tab is a route. */
  asChild?: boolean;
  children?: React.ReactNode;
}

export interface TabsProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  items?: TabItem[];
}

const TabsRoot = forwardRef<
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
      activationMode,
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

    // Link tabs navigate on click or Enter; arrow keys only move focus, so they never select a tab whose page isn't open.
    const hasLinks = items?.some((item) => item.asChild) ?? false;

    return (
      <TabsPrimitive.Root
        ref={ref}
        value={activeValue}
        onValueChange={setActiveValue}
        activationMode={activationMode ?? (hasLinks ? 'manual' : 'automatic')}
        className={cn('w-full', className)}
        {...props}
      >
        {items && items.length > 0 ? (
          <TabsList>
            {items.map((item) => {
              const isSlot = item.asChild && React.isValidElement(item.children);
              return (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  count={item.count}
                  disabled={item.disabled}
                  asChild={isSlot}
                >
                  {isSlot
                    ? React.cloneElement(
                        item.children as React.ReactElement<{ children?: React.ReactNode }>,
                        undefined,
                        item.label,
                      )
                    : item.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        ) : null}
        {children}
      </TabsPrimitive.Root>
    );
  },
);

TabsRoot.displayName = 'Tabs';

/** True once TabsList's measured indicator has taken over from the per-tab active underline. */
const IndicatorContext = createContext(false);

const ACTIVE_TAB = '[role="tab"][data-state="active"]';

/** Underline slides between tabs (dur-base, none under reduced motion). First paint keeps each tab's own underline; the indicator replaces it once measured. */
const TabsList = forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const listRef = useRef<HTMLDivElement | null>(null);
  const { rect, animated } = useSlidingIndicator(listRef, ACTIVE_TAB, ['data-state']);

  return (
    <TabsPrimitive.List
      ref={(node) => {
        listRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      className={cn(
        'relative flex items-center gap-space-4 border-b border-line overflow-x-auto overflow-y-hidden flex-nowrap scrollbar-none',
        className,
      )}
      {...props}
    >
      <IndicatorContext.Provider value={rect !== null}>{children}</IndicatorContext.Provider>
      {rect ? (
        <span
          aria-hidden="true"
          data-tabs-indicator=""
          className={cn(
            'pointer-events-none absolute -bottom-px left-0 border-b-2 border-brand',
            animated && 'transition-all duration-base motion-reduce:transition-none',
          )}
          style={{ width: rect.width, transform: `translateX(${rect.left}px)` }}
        />
      ) : null}
    </TabsPrimitive.List>
  );
});

TabsList.displayName = 'TabsList';

export interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  count?: number | string;
}

/** With `asChild`, `children` is one link element whose own children are the label. */
const TabsTrigger = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, children, count, disabled, asChild, onClick, ...props }, ref) => {
  const content = (label: React.ReactNode) => (
    <>
      <span>{label}</span>
      {count !== undefined && count !== null ? (
        <span className="text-ink-3 font-medium"> · {count}</span>
      ) : null}
    </>
  );
  const indicatorOn = useContext(IndicatorContext);
  const link = asChild && React.isValidElement(children)
    ? (children as React.ReactElement<{ children?: React.ReactNode }>)
    : null;

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      disabled={disabled}
      asChild={!!link}
      onClick={(e) => {
        // A disabled link tab must not navigate.
        if (disabled && link) e.preventDefault();
        onClick?.(e);
      }}
      className={cn(
        'inline-block no-underline font-text text-body py-space-10 px-space-12 whitespace-nowrap border-b-2 rounded-none -mb-px transition-colors duration-fast select-none cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset',
        'font-semibold text-ink-3 border-transparent hover:text-ink hover:bg-hover active:bg-pressed',
        'data-active:text-brand-strong data-active:font-bold data-active:hover:bg-transparent data-active:hover:text-brand-strong',
        indicatorOn ? 'data-active:border-transparent' : 'data-active:border-brand',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      {...props}
    >
      {link
        ? React.cloneElement(link, undefined, content(link.props.children))
        : content(children)}
    </TabsPrimitive.Trigger>
  );
});

TabsTrigger.displayName = 'TabsTrigger';

const TabsContent = forwardRef<
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

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
});
