import React, {
  createContext,
  forwardRef,
  useContext,
  useId,
  useState,
} from 'react';

import { cn } from '../cn';

export interface TabItem {
  value: string;
  label: React.ReactNode;
  count?: number | string;
  disabled?: boolean;
}

interface TabsContextValue {
  value: string;
  onValueChange: (val: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error('Tabs compound components must be rendered within <Tabs>');
  }
  return ctx;
}

export interface TabsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  items?: TabItem[];
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      value: controlledValue,
      defaultValue,
      onValueChange,
      items,
      children,
      className,
      ...props
    },
    ref,
  ) => {
    const baseId = useId();
    const isControlled = controlledValue !== undefined;
    const defaultVal =
      defaultValue !== undefined
        ? defaultValue
        : items && items.length > 0
          ? items[0].value
          : '';

    const [internalValue, setInternalValue] = useState(defaultVal);
    const activeValue = isControlled ? controlledValue : internalValue;

    const handleValueChange = (val: string) => {
      if (!isControlled) {
        setInternalValue(val);
      }
      onValueChange?.(val);
    };

    return (
      <TabsContext.Provider
        value={{
          value: activeValue,
          onValueChange: handleValueChange,
          baseId,
        }}
      >
        <div ref={ref} className={cn('w-full', className)} {...props}>
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
          ) : (
            children
          )}
        </div>
      </TabsContext.Provider>
    );
  },
);

Tabs.displayName = 'Tabs';

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children, onKeyDown, ...props }, ref) => {
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
      <div
        ref={ref}
        role="tablist"
        onKeyDown={handleKeyDown}
        className={cn(
          'flex items-center gap-space-4 border-b border-line overflow-x-auto flex-nowrap scrollbar-none',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

TabsList.displayName = 'TabsList';

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  count?: number | string;
}

export const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  (
    {
      value: triggerValue,
      count,
      disabled = false,
      children,
      className,
      onClick,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const { value: activeValue, onValueChange, baseId } = useTabsContext();
    const isActive = activeValue === triggerValue;
    const tabId = `${baseId}-tab-${triggerValue}`;
    const panelId = `${baseId}-panel-${triggerValue}`;

    return (
      <button
        ref={ref}
        id={tabId}
        type={type}
        role="tab"
        aria-selected={isActive}
        aria-controls={panelId}
        tabIndex={isActive ? 0 : -1}
        disabled={disabled}
        onClick={(e) => {
          onClick?.(e);
          if (!disabled) {
            onValueChange(triggerValue);
          }
        }}
        className={cn(
          'font-text text-body py-space-10 px-space-12 whitespace-nowrap border-b-2 transition-colors duration-fast select-none cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset rounded-ds-sm',
          isActive
            ? 'text-brand-strong border-brand font-bold'
            : 'font-semibold text-ink-3 border-transparent hover:text-ink',
          disabled && 'opacity-50 cursor-not-allowed',
          className,
        )}
        {...props}
      >
        <span>{children}</span>
        {count !== undefined && count !== null ? (
          <span> · {count}</span>
        ) : null}
      </button>
    );
  },
);

TabsTrigger.displayName = 'TabsTrigger';

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value: contentValue, className, children, ...props }, ref) => {
    const { value: activeValue, baseId } = useTabsContext();
    const isActive = activeValue === contentValue;
    const tabId = `${baseId}-tab-${contentValue}`;
    const panelId = `${baseId}-panel-${contentValue}`;

    if (!isActive) return null;

    return (
      <div
        ref={ref}
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId}
        tabIndex={0}
        className={cn('outline-none py-space-12', className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

TabsContent.displayName = 'TabsContent';
