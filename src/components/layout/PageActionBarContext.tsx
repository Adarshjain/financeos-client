'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import { useKeyboardInset } from './useKeyboardInset';

interface PageActionBarConfig {
  content: React.ReactNode | null;
  hideOnScroll?: boolean;
  trigger?: React.ReactNode;
  defaultCollapsed?: boolean;
}

interface PageActionBarContextType {
  config: PageActionBarConfig;
  setConfig: (config: PageActionBarConfig) => void;
}

const PageActionBarContext = createContext<PageActionBarContextType>({
  config: { content: null, hideOnScroll: false, defaultCollapsed: false },
  setConfig: () => {},
});

export function PageActionBarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState<PageActionBarConfig>({
    content: null,
    hideOnScroll: false,
    defaultCollapsed: false,
  });

  return (
    <PageActionBarContext.Provider value={{ config, setConfig }}>
      {children}
    </PageActionBarContext.Provider>
  );
}

interface PageActionBarProps {
  children: React.ReactNode;
  hideOnScroll?: boolean;
  trigger?: React.ReactNode;
  defaultCollapsed?: boolean;
  defaultOpen?: boolean;
}

/**
 * Component used inside ANY page or feature view to declare its mobile bottom action bar.
 */
export function PageActionBar({
  children,
  hideOnScroll = true,
  trigger,
  defaultCollapsed = false,
  defaultOpen,
}: PageActionBarProps) {
  const { setConfig } = useContext(PageActionBarContext);

  const isInitiallyCollapsed = defaultOpen !== undefined ? !defaultOpen : defaultCollapsed;

  useEffect(() => {
    setConfig({
      content: children,
      hideOnScroll,
      trigger,
      defaultCollapsed: isInitiallyCollapsed,
    });
    return () => setConfig({ content: null, hideOnScroll: false, trigger: undefined, defaultCollapsed: false });
  }, [children, hideOnScroll, trigger, isInitiallyCollapsed, setConfig]);

  return null;
}

/**
 * Slot rendered inside the protected layout directly above MobileNav on mobile viewports.
 */
export function PageActionBarSlot() {
  const { config } = useContext(PageActionBarContext);
  const keyboardInset = useKeyboardInset();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(config?.defaultCollapsed ?? false);
  // While a field inside the bar has focus, hide-on-scroll is paused: iOS
  // scrolls the page to reveal the focused field, which would otherwise read
  // as a scroll-down and slide the bar away mid-typing.
  const [hasFocusWithin, setHasFocusWithin] = useState(false);
  const lastScrollY = useRef(0);

  const [prevHideOnScroll, setPrevHideOnScroll] = useState(config?.hideOnScroll);
  if (config?.hideOnScroll !== prevHideOnScroll) {
    setPrevHideOnScroll(config?.hideOnScroll);
    setIsVisible(true);
  }

  const [prevContent, setPrevContent] = useState(config?.content);
  const [prevDefaultCollapsed, setPrevDefaultCollapsed] = useState(config?.defaultCollapsed);
  if (config?.content !== prevContent || config?.defaultCollapsed !== prevDefaultCollapsed) {
    setPrevContent(config?.content);
    setPrevDefaultCollapsed(config?.defaultCollapsed);
    setIsVisible(true);
    setIsCollapsed(config?.defaultCollapsed ?? false);
  }

  useEffect(() => {
    if (!config?.hideOnScroll || isCollapsed || hasFocusWithin) return;
    // Resync so a page the browser scrolled while we were paused does not
    // register as a scroll-down on the first event after resuming.
    lastScrollY.current = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        // Scroll Down -> hide offscreen
        setIsVisible(false);
      } else {
        // Scroll Up -> show
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [config?.hideOnScroll, isCollapsed, hasFocusWithin]);

  if (!config?.content) return null;

  // Keyboard up: MobileNav slides out, so the bar drops to sit 8px above the
  // keyboard. Otherwise it stacks above the 48px nav (8px inset + 8px gap);
  // collapsed, only the toggle shows and it parks on the nav's top edge.
  const bottom = keyboardInset > 0 ? keyboardInset + 8 : isCollapsed ? 53 : 64;

  return (
    <div
      ref={rootRef}
      style={{ bottom }}
      onFocus={() => {
        setHasFocusWithin(true);
        setIsVisible(true);
      }}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget)) setHasFocusWithin(false);
      }}
      className={cn(
        'lg:hidden fixed left-3 right-3 z-30 flex flex-col items-end transition-all duration-300 ease-in-out',
        config.hideOnScroll && !isVisible && !isCollapsed
          ? 'translate-y-36 opacity-0 pointer-events-none'
          : 'translate-y-0 opacity-100',
      )}
    >
      <button
        type="button"
        onClick={() => setIsCollapsed((prev) => !prev)}
        aria-label={isCollapsed ? 'Expand action bar' : 'Collapse action bar'}
        title={isCollapsed ? 'Expand' : 'Collapse'}
        className={cn(
          'mr-4 z-10 flex items-center justify-center transition-all duration-300 ease-in-out',
          'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-slate-900/70 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100',
          'border border-slate-200 dark:border-slate-800 border-b-0 -mb-px rounded-t-xl pt-0.5 shadow-none h-[30px]',
          config.trigger ? 'px-3 gap-1.5 min-w-[2.5rem]' : 'w-10',
        )}
      >
        {config.trigger}
        {isCollapsed ? (
          <ChevronUp className="w-4 h-4 transition-transform duration-200 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 transition-transform duration-200 shrink-0" />
        )}
      </button>

      <div
        className={cn(
          'w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-xl flex items-center justify-between gap-2 transition-all duration-300 ease-in-out overflow-hidden',
          isCollapsed
            ? 'max-h-0 py-0 border-transparent opacity-0 pointer-events-none scale-95'
            : 'max-h-96 opacity-100 scale-100 pointer-events-auto',
        )}
      >
        {config.content}
      </div>
    </div>
  );
}

