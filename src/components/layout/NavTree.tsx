'use client';

import { ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import {
  INVESTMENTS_MODULE,
  isNavItemActive,
  NAV_ITEMS,
  NavItem,
  NavModule,
  TRANSACTIONS_MODULE,
} from '@/components/layout/navigation';
import { cn } from '@/lib/utils';

interface NavTreeProps {
  onItemClick?: () => void;
  renderItemWrapper?: (children: React.ReactNode, key: string) => React.ReactNode;
}

export function NavTree({ onItemClick, renderItemWrapper }: NavTreeProps) {
  const pathname = usePathname();

  const [openTransactions, setOpenTransactions] = useState(
    pathname.startsWith('/transactions') ||
      pathname.startsWith('/dashboards') ||
      pathname.startsWith('/reports') ||
      pathname.startsWith('/rules') ||
      pathname.startsWith('/categories'),
  );
  const [openInvestments, setOpenInvestments] = useState(
    pathname.startsWith('/investments'),
  );

  const renderLink = (item: NavItem, isTopLevel = false) => {
    const isActive = isNavItemActive(pathname, item.href);
    const content = (
      <Link
        href={item.href}
        onClick={onItemClick}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 w-full cursor-pointer select-none',
          isActive
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/10 font-bold'
            : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850/50',
        )}
      >
        <span
          className={cn(
            'transition-transform duration-200',
            isActive
              ? 'text-white'
              : isTopLevel
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-400 dark:text-slate-400',
          )}
        >
          {item.icon}
        </span>
        <span>{item.label}</span>
      </Link>
    );

    if (renderItemWrapper) {
      return renderItemWrapper(content, item.href);
    }
    return <div key={item.href}>{content}</div>;
  };

  const renderModule = (
    module: NavModule,
    isOpen: boolean,
    toggleOpen: () => void,
  ) => (
    <div className="pt-2">
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider select-none"
      >
        <span>{module.label}</span>
        <ChevronUp
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-200',
            !isOpen && '-rotate-180',
          )}
        />
      </button>
      {isOpen && (
        <div className="space-y-0.5 mt-0.5">
          {module.items.map((subItem) => renderLink(subItem))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-1">
      {/* Top Level Links */}
      {renderLink(NAV_ITEMS.home, true)}
      {renderLink(NAV_ITEMS.accounts, true)}

      {/* Expandable Modules */}
      {renderModule(TRANSACTIONS_MODULE, openTransactions, () =>
        setOpenTransactions(!openTransactions),
      )}
      {renderModule(INVESTMENTS_MODULE, openInvestments, () =>
        setOpenInvestments(!openInvestments),
      )}

      {renderLink(NAV_ITEMS.settings, true)}
    </div>
  );
}
