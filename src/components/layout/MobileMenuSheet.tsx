'use client';

import { LogOut, Menu, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { logout } from '@/actions/auth';
import {
  INSIGHTS_MODULE,
  INVESTMENTS_MODULE,
  isNavItemActive,
  LOANS_MODULE,
  NAV_ITEMS,
  NavItem,
  NavModule,
  REWARDS_MODULE,
  TRANSACTIONS_MODULE,
} from '@/components/layout/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import { useKeyboardInset } from './useKeyboardInset';

const GROUPS: NavModule[] = [
  TRANSACTIONS_MODULE,
  INVESTMENTS_MODULE,
  LOANS_MODULE,
  REWARDS_MODULE,
  INSIGHTS_MODULE,
];

interface MobileMenuSheetProps {
  userEmail?: string;
}

export function MobileMenuSheet({ userEmail }: MobileMenuSheetProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const keyboardInset = useKeyboardInset();

  const close = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-center h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors focus:outline-none shadow-sm"
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        srTitle="Navigation menu"
        className="z-[60] rounded-t-3xl rounded-b-none bottom-0 left-0 right-0 bg-white dark:bg-slate-950"
        style={
          keyboardInset > 0
            ? {
                bottom: keyboardInset,
                maxHeight: `calc(100dvh - ${keyboardInset}px - 8px)`,
              }
            : undefined
        }
      >
        <div className="flex justify-center pt-2 pb-1" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        <div className="space-y-1 p-4 pt-2">
          <SheetLink
            href={NAV_ITEMS.chat.href}
            active={isNavItemActive(pathname, NAV_ITEMS.chat.href)}
            onClick={close}
          >
            <SheetIcon>
              <MessageSquare />
            </SheetIcon>
            <span className="flex flex-col leading-tight">
              <span>Chat</span>
              <span className="text-2xs font-medium opacity-70">Ask your data</span>
            </span>
          </SheetLink>

          <SheetLink
            href={NAV_ITEMS.accounts.href}
            active={isNavItemActive(pathname, NAV_ITEMS.accounts.href)}
            onClick={close}
          >
            <SheetIcon>{NAV_ITEMS.accounts.icon}</SheetIcon>
            <span>{NAV_ITEMS.accounts.label}</span>
          </SheetLink>

          {GROUPS.map((group) => (
            <div key={group.key} className="py-1">
              <div className="flex items-center gap-3 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <SheetIcon>{group.icon}</SheetIcon>
                <span>{group.label}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pl-11 pr-2">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-xs font-semibold',
                      isNavItemActive(pathname, item.href)
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                    )}
                  >
                    {chipLabel(group, item)}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <div className="my-2 h-px bg-slate-100 dark:bg-slate-800" />

          <SheetLink
            href={NAV_ITEMS.settings.href}
            active={isNavItemActive(pathname, NAV_ITEMS.settings.href)}
            onClick={close}
          >
            <SheetIcon>{NAV_ITEMS.settings.icon}</SheetIcon>
            <span>{NAV_ITEMS.settings.label}</span>
          </SheetLink>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-3">
          {userEmail && (
            <div className="min-w-0">
              <p className="text-2xs uppercase font-extrabold tracking-wider text-slate-400 dark:text-slate-500">
                Signed in as
              </p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                {userEmail}
              </p>
            </div>
          )}
          <form action={logout}>
            <Button variant="outline" type="submit" className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** A group's own landing page reads "All" inside that group (e.g. Transactions > All). */
function chipLabel(group: NavModule, item: NavItem): string {
  const label = item.shortLabel ?? item.label;
  return label === group.label ? 'All' : label;
}

/**
 * One icon treatment for every row and group: a neutral 16px glyph that takes the row's text
 * colour, so an active (emerald) row turns it white and nothing else is tinted.
 */
function SheetIcon({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-500 dark:text-slate-400 [&>svg]:h-4 [&>svg]:w-4 group-data-[active=true]:text-white"
    >
      {children}
    </span>
  );
}

function SheetLink({
  href,
  active,
  onClick,
  className,
  children,
}: {
  href: string;
  active: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      data-active={active}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors',
        active
          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
          : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
        !active && className,
      )}
    >
      {children}
    </Link>
  );
}
