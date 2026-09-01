'use client';

import { Search, X } from 'lucide-react';

import { TablePagination } from '@/components/reports/views/TablePagination';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Broker } from '@/lib/account.types';
import { cn } from '@/lib/utils';

interface TradebookFilterBarProps {
  searchInput: string;
  setSearchInput: (s: string) => void;
  selectedBrokerFilter: string;
  onBrokerFilterChange: (b: string) => void;
  brokerAccounts: Broker[];
  currentPage: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onSizeChange: (s: number) => void;
  isMobile?: boolean;
}

export function TradebookFilterBar({
  searchInput,
  setSearchInput,
  selectedBrokerFilter,
  onBrokerFilterChange,
  brokerAccounts,
  currentPage,
  pageSize,
  totalElements,
  totalPages,
  onPageChange,
  onSizeChange,
  isMobile = false,
}: TradebookFilterBarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 w-full',
        isMobile ? 'flex-col sm:flex-row text-xs' : 'flex-wrap'
      )}
    >
      {/* Search Input & Broker */}
      <div className="flex flex-row gap-2">
        <div className="relative flex-1 min-w-[180px] w-full">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by symbol or name..."
            className="h-8 pl-8 pr-7 text-xs font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg w-full"
          />
          {searchInput && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchInput('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Broker Select Filter */}
        <Select
          value={selectedBrokerFilter}
          onValueChange={onBrokerFilterChange}
        >
          <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold w-[150px] shrink-0">
            <SelectValue placeholder="All Brokers" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
            <SelectItem value="all" className="text-xs font-medium">
              All Brokers
            </SelectItem>
            {brokerAccounts.map((b) => (
              <SelectItem key={b.id} value={b.id} className="text-xs font-medium">
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Integrated Pagination Controls */}
      <TablePagination
        page={{
          number: currentPage,
          size: pageSize,
          totalElements,
          totalPages,
        }}
        onPageChange={onPageChange}
        onSizeChange={onSizeChange}
        unit="trade"
        className="flex flex-row"
      />
    </div>
  );
}
