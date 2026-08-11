'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

interface PageActionBarConfig {
  content: React.ReactNode | null;
  hideOnScroll?: boolean;
}

interface PageActionBarContextType {
  config: PageActionBarConfig;
  setConfig: (config: PageActionBarConfig) => void;
}

const PageActionBarContext = createContext<PageActionBarContextType>({
  config: { content: null, hideOnScroll: false },
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
}

/**
 * Component used inside ANY page or feature view to declare its mobile bottom action bar.
 */
export function PageActionBar({ children, hideOnScroll = true }: PageActionBarProps) {
  const { setConfig } = useContext(PageActionBarContext);

  useEffect(() => {
    setConfig({ content: children, hideOnScroll });
    return () => setConfig({ content: null, hideOnScroll: false });
  }, [children, hideOnScroll, setConfig]);

  return null;
}

/**
 * Slot rendered inside the protected layout directly above MobileNav on mobile viewports.
 */
export function PageActionBarSlot() {
  const { config } = useContext(PageActionBarContext);
  const [isVisible, setIsVisible] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const lastScrollY = useRef(0);

  const [prevHideOnScroll, setPrevHideOnScroll] = useState(config?.hideOnScroll);
  if (config?.hideOnScroll !== prevHideOnScroll) {
    setPrevHideOnScroll(config?.hideOnScroll);
    setIsVisible(true);
  }

  const [prevContent, setPrevContent] = useState(config?.content);
  if (config?.content !== prevContent) {
    setPrevContent(config?.content);
    setIsVisible(true);
    setIsCollapsed(false);
  }

  useEffect(() => {
    if (!config?.hideOnScroll || isCollapsed) return;

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
  }, [config?.hideOnScroll, isCollapsed]);

  if (!config?.content) return null;

  return (
    <div
      className={cn(
        'lg:hidden fixed bottom-16 left-3 right-3 z-30 flex flex-col items-end transition-all duration-300 ease-in-out',
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
          'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100',
          'border border-slate-200 dark:border-slate-800',
          isCollapsed
            ? 'w-10 h-[34px] rounded-t-full pt-0.5 shadow-md'
            : 'w-10 h-[30px] rounded-t-full border-b-0 -mb-px pt-0.5 shadow-none',
        )}
      >
        {isCollapsed ? (
          <ChevronUp className="w-4 h-4 transition-transform duration-200" />
        ) : (
          <ChevronDown className="w-4 h-4 transition-transform duration-200" />
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

