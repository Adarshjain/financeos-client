'use client';

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
export function PageActionBar({ children, hideOnScroll = false }: PageActionBarProps) {
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
  const lastScrollY = useRef(0);
  const [prevHideOnScroll, setPrevHideOnScroll] = useState(config?.hideOnScroll);
  if (config?.hideOnScroll !== prevHideOnScroll) {
    setPrevHideOnScroll(config?.hideOnScroll);
    setIsVisible(true);
  }

  useEffect(() => {
    if (!config?.hideOnScroll) return;

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
  }, [config?.hideOnScroll]);

  if (!config?.content) return null;

  return (
    <div
      className={cn(
        'lg:hidden fixed bottom-16 left-3 right-3 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-xl flex items-center justify-between gap-2 transition-all duration-300 ease-in-out',
        config.hideOnScroll && !isVisible
          ? 'translate-y-28 opacity-0 pointer-events-none'
          : 'translate-y-0 opacity-100',
      )}
    >
      {config.content}
    </div>
  );
}

