'use client';

import { Search } from 'lucide-react';

import { TablePagination } from '@/components/reports/views/TablePagination';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface RulesFilterBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  searchVal: string;
  setSearchVal: (s: string) => void;
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  isPending: boolean;
  onPageChange: (newPage: number) => void;
  onSizeChange: (newSize: number) => void;
}

export function RulesFilterBar({
  activeTab,
  onTabChange,
  searchVal,
  setSearchVal,
  pageNumber,
  pageSize,
  totalElements,
  totalPages,
  isPending,
  onPageChange,
  onSizeChange,
}: RulesFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {/* Toggle Chips/Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl w-fit">
        {[
          { id: 'false', label: 'Unverified' },
          { id: 'true', label: 'Verified' },
          { id: 'all', label: 'All' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search Box */}
      <div className="relative min-w-[240px] flex-1 max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search merchant keys or display names..."
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          className="pl-9 pr-4 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500 focus-visible:border-transparent transition-all"
        />
      </div>

      <TablePagination
        page={{
          number: pageNumber,
          size: pageSize,
          totalElements,
          totalPages,
        }}
        loading={isPending}
        onPageChange={onPageChange}
        onSizeChange={onSizeChange}
        unit="rule"
        className="w-full px-1"
      />
    </div>
  );
}
