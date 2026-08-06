'use client';

import { LogOut, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { logout } from '@/actions/auth';
import { NavTree } from '@/components/layout/NavTree';
import { getMobileNavContext, isNavItemActive } from '@/components/layout/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  userEmail?: string;
}

export function MobileNav({ userEmail }: MobileNavProps) {
  const pathname = usePathname();
  const { mode, items } = getMobileNavContext(pathname);

  return (
    <nav className="lg:hidden fixed bottom-2 left-3 right-3 h-12 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-slate-900/70 border rounded-2xl border-slate-200 dark:border-slate-800 z-40 flex items-center shadow-lg overflow-hidden px-1">
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
      <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1">
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
            </Link>
          );
        })}
      </div>

      {/* Sticky Right: Hamburger Menu Button */}
      <div className="sticky right-0 z-10 shrink-0 ml-1 bg-white/95 dark:bg-slate-900/95 pl-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center justify-center h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors focus:outline-none shadow-sm"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[calc(100vw-24px)] md:w-[340px] max-w-[400px] max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 shadow-2xl space-y-2"
            align="end"
            alignOffset={-4}
            sideOffset={12}
          >
            {/* User Profile Header */}
            {userEmail && (
              <DropdownMenuGroup className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800/60">
                <DropdownMenuLabel className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 dark:text-slate-500 p-0 leading-none">
                  Signed in as
                </DropdownMenuLabel>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
                  {userEmail}
                </div>
              </DropdownMenuGroup>
            )}

            {/* Reusable NavTree */}
            <NavTree
              renderItemWrapper={(children, key) => (
                <DropdownMenuItem key={key} asChild>
                  {children}
                </DropdownMenuItem>
              )}
            />

            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800/80 my-1" />

            {/* Top Level: Sign Out */}
            <form action={logout}>
              <DropdownMenuItem asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  type="submit"
                  className="w-full justify-start rounded-xl hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 gap-2.5 h-9 px-3 transition-colors text-xs font-semibold cursor-pointer focus:outline-none"
                >
                  <LogOut className="h-4 w-4 text-slate-500" />
                  Sign out
                </Button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
