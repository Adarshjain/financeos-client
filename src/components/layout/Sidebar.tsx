'use client';

import {
  Home,
  LogOut,
  Receipt,
  Settings,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { logout } from '@/actions/auth';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: <Home className="h-5 w-5" />,
  },
  {
    href: '/accounts',
    label: 'Accounts',
    icon: <Wallet className="h-5 w-5" />,
  },
  {
    href: '/transactions',
    label: 'Transactions',
    icon: <Receipt className="h-5 w-5" />,
  },
  {
    href: '/investments',
    label: 'Investments',
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />,
  },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      {/* Logo */}
      <div className="h-16 flex items-center px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size="md" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <p className="text-xs text-slate-500">Signed in as</p>
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
          {userEmail}
        </p>
      </div>
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <form action={logout}>
          <Button variant="outline" size="sm" type="submit" className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
