'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { formatBadge } from '@/components/inbox/inbox.helpers';
import { getMobileNavContext, isNavItemActive, NAV_ITEMS } from '@/components/layout/navigation';
import { useInboxSummary } from '@/lib/query/hooks/useInbox';
import { cn } from '@/lib/utils';

import { MobileMenuSheet } from './MobileMenuSheet';
import { useKeyboardInset } from './useKeyboardInset';

interface MobileNavProps {
  userEmail?: string;
  /** Count badge for the Inbox item; omitted/null/0 renders no badge. */
  inboxCount?: number | null;
}

export function MobileNav({ userEmail, inboxCount }: MobileNavProps) {
  const pathname = usePathname();
  const { mode, items } = getMobileNavContext(pathname);
  const keyboardOpen = useKeyboardInset() > 0;
  const { data: inboxSummary } = useInboxSummary();
  const inboxBadge = formatBadge(inboxCount ?? inboxSummary?.badge);

  return (
    <nav
      aria-hidden={keyboardOpen || undefined}
      inert={keyboardOpen || undefined}
      className={cn(
        'lg:hidden fixed bottom-2 left-3 right-3 h-12 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-slate-900/70 border rounded-2xl border-slate-200 dark:border-slate-800 z-40 flex items-center shadow-lg overflow-hidden px-1',
        'transition-[transform,opacity] duration-300 ease-in-out',
        // Under an open keyboard the nav is buried anyway; slide it out so
        // PageActionBarSlot can take its place just above the keyboard.
        keyboardOpen && 'translate-y-20 opacity-0 pointer-events-none',
      )}
    >
      {/* Sticky Left: X (Close to Home) Icon */}
      {mode !== 'default' && (
        <Link
          href="/dashboard"
          className="sticky left-0 z-10 flex items-center justify-center h-9 w-9 min-w-[36px] rounded-xl bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0 shadow-sm mr-1"
          aria-label="Return to Home"
        >
          <X className="h-4 w-4" />
        </Link>
      )}

      {/* Middle: Horizontally Scrollable Text-Only Nav Items */}
      <div className="flex-1 flex items-center overflow-x-auto no-scrollbar scroll-smooth py-1">
        {items.map((item) => {
          const isActive = isNavItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 select-none',
                isActive
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
              )}
            >
              {item.shortLabel ?? item.label}
              {item.href === NAV_ITEMS.inbox.href && inboxBadge ? (
                <span
                  className="ml-1 rounded-full bg-rose-500 px-1.5 text-2xs font-bold text-white"
                  data-testid="inbox-nav-badge"
                >
                  {inboxBadge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {/* Sticky Right: Hamburger Menu Button */}
      <div className="sticky right-0 z-10 shrink-0 ml-1 bg-white/95 dark:bg-slate-900/95 pl-0.5 flex items-center gap-1">
        <MobileMenuSheet userEmail={userEmail} />
      </div>
    </nav>
  );
}
