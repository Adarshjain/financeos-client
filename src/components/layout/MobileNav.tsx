'use client';

import { Home, LogOut, Menu, Receipt, Settings, TrendingUp, Wallet } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { logout } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
      className="lg:hidden fixed bottom-2 left-2 right-2 h-12 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 border rounded-2xl border-slate-200 dark:border-slate-800 z-40 flex items-center justify-between px-2">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800',
            )}
          >
            {/*{item.icon}*/}
            {item.label}
          </Link>
        );
      })}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800',
            )}
          >
            <Menu className="h-5 w-5" />
            {/*You*/}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <div className="min-w-[200px] w-[200px] !text-lg">
            <DropdownMenuGroup>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <div className="px-2">{userEmail}</div>
            </DropdownMenuGroup>
            <DropdownMenuGroup>
              <DropdownMenuSeparator className="my-1" />
              {[accountRoute, settingsRoute].map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-1 w-[200px]',
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800',
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </DropdownMenuGroup>
            <form action={logout}>
              <Button
                variant="ghost"
                size="sm"
                type="submit"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sign out
              </Button>
            </form>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
