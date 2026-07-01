'use client';

import { BarChart3, Home, LayoutDashboard, LogOut, Menu, Receipt, Settings, TrendingUp, Wallet } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { logout } from '@/actions/auth';
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

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const dashboardRoute: NavItem = {
  href: '/dashboard',
  label: 'Home',
  icon: <Home className="h-5 w-5" />,
};

const accountRoute: NavItem = {
  href: '/accounts',
  label: 'Accounts',
  icon: <Wallet className="h-5 w-5" />,
};

const transactionRoute: NavItem = {
  href: '/transactions',
  label: 'Transactions',
  icon: <Receipt className="h-5 w-5" />,
};
const investmentRoute: NavItem = {
  href: '/investments',
  label: 'Stocks & MF',
  icon: <TrendingUp className="h-5 w-5" />,
};

const reportsRoute: NavItem = {
  href: '/reports',
  label: 'Reports',
  icon: <BarChart3 className="h-5 w-5" />,
};

const dashboardsRoute: NavItem = {
  href: '/dashboards',
  label: 'Dashboards',
  icon: <LayoutDashboard className="h-5 w-5" />,
};

const settingsRoute: NavItem = {
  href: '/settings',
  label: 'Settings',
  icon: <Settings className="h-5 w-5" />,
};

const navItems: NavItem[] = [
  dashboardRoute,
  transactionRoute,
  investmentRoute,
];

interface MobileNavProps {
  userEmail?: string;
}

export function MobileNav({ userEmail }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-2 left-3 right-3 h-12 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 border rounded-2xl border-slate-200 dark:border-slate-800 z-40 flex items-center justify-between px-2">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200',
              isActive
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                : 'text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900',
            )}
          >
            {/*{item.icon}*/}
            {item.label}
          </Link>
        );
      })}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'flex flex-col items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors focus:outline-none',
            )}
          >
            <Menu className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[calc(100vw-24px)] md:w-[320px] max-w-[400px] bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-3 shadow-xl"
          align="end"
          sideOffset={8}
        >
          <div className="w-full space-y-2">
            <DropdownMenuGroup className="px-3 py-2 bg-slate-50 dark:bg-slate-900/35 rounded-xl border border-slate-100 dark:border-slate-800/40">
              <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 p-0 leading-none">Signed in as</DropdownMenuLabel>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1.5 truncate">{userEmail}</div>
            </DropdownMenuGroup>
            <DropdownMenuGroup className="space-y-1">
              {[accountRoute, reportsRoute, dashboardsRoute, settingsRoute].map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-205 w-full cursor-pointer focus:outline-none outline-none select-none',
                        isActive
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-650 text-white shadow-sm'
                          : 'text-slate-655 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900',
                      )}
                    >
                      <span className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800/80 my-1" />
            <form action={logout}>
              <DropdownMenuItem asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  type="submit"
                  className="w-full justify-start rounded-xl hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 dark:hover:text-rose-450 gap-2 h-9 px-3 transition-colors text-xs font-semibold cursor-pointer focus:outline-none outline-none"
                >
                  <LogOut className="h-4 w-4 text-slate-500" />
                  Sign out
                </Button>
              </DropdownMenuItem>
            </form>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
