'use client';

import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Broker } from '@/lib/account.types';

interface FnoFilterBarProps {
  search: string;
  setSearch: (s: string) => void;
  contractTypeFilter: string;
  setContractTypeFilter: (c: string) => void;
  optionTypeFilter: string;
  setOptionTypeFilter: (o: string) => void;
  brokerFilter: string;
  setBrokerFilter: (b: string) => void;
  brokerAccounts: Broker[];
  hasActiveFilters: boolean;
  clearFilters: () => void;
  isMobile?: boolean;
}

export function FnoFilterBar({
  search,
  setSearch,
  contractTypeFilter,
  setContractTypeFilter,
  optionTypeFilter,
  setOptionTypeFilter,
  brokerFilter,
  setBrokerFilter,
  brokerAccounts,
  hasActiveFilters,
  clearFilters,
  isMobile = false,
}: FnoFilterBarProps) {
  if (isMobile) {
    return (
      <div className="flex flex-col gap-1.5 w-full text-xs">
        {/* Row 1: Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search symbol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 rounded-lg h-8 text-xs bg-white dark:bg-slate-950"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Row 2: Contract, Option Type, Broker Filter & Clear */}
        <div className="flex flex-wrap items-center gap-1.5 w-full">
          <Select
            value={contractTypeFilter}
            onValueChange={setContractTypeFilter}
          >
            <SelectTrigger className="w-[105px] rounded-lg h-8 text-xs bg-white dark:bg-slate-950">
              <SelectValue placeholder="Contract" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-xs">
                All Contracts
              </SelectItem>
              <SelectItem value="future" className="text-xs">
                Futures (FUT)
              </SelectItem>
              <SelectItem value="option" className="text-xs">
                Options (OPT)
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={optionTypeFilter}
            onValueChange={setOptionTypeFilter}
          >
            <SelectTrigger className="flex-1 min-w-[95px] rounded-lg h-8 text-xs bg-white dark:bg-slate-950">
              <SelectValue placeholder="Option" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-xs">
                All Options
              </SelectItem>
              <SelectItem value="CE" className="text-xs">
                Call (CE)
              </SelectItem>
              <SelectItem value="PE" className="text-xs">
                Put (PE)
              </SelectItem>
            </SelectContent>
          </Select>

          {brokerAccounts.length > 0 && (
            <Select value={brokerFilter} onValueChange={setBrokerFilter}>
              <SelectTrigger className="flex-1 min-w-[105px] rounded-lg h-8 text-xs bg-white dark:bg-slate-950">
                <SelectValue placeholder="Broker" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs">
                  All Brokers
                </SelectItem>
                {brokerAccounts.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-slate-500 hover:text-slate-900"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
        <Input
          placeholder="Search symbol or underlying..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 rounded-lg h-8 text-xs"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <Select
        value={contractTypeFilter}
        onValueChange={setContractTypeFilter}
      >
        <SelectTrigger className="w-[120px] rounded-lg h-8 text-xs">
          <SelectValue placeholder="Contract" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          <SelectItem value="all" className="text-xs">
            All Contracts
          </SelectItem>
          <SelectItem value="future" className="text-xs">
            Futures (FUT)
          </SelectItem>
          <SelectItem value="option" className="text-xs">
            Options (OPT)
          </SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={optionTypeFilter}
        onValueChange={setOptionTypeFilter}
      >
        <SelectTrigger className="w-[110px] rounded-lg h-8 text-xs">
          <SelectValue placeholder="Option Type" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          <SelectItem value="all" className="text-xs">
            All Types
          </SelectItem>
          <SelectItem value="CE" className="text-xs">
            Call (CE)
          </SelectItem>
          <SelectItem value="PE" className="text-xs">
            Put (PE)
          </SelectItem>
        </SelectContent>
      </Select>

      {brokerAccounts.length > 0 && (
        <Select value={brokerFilter} onValueChange={setBrokerFilter}>
          <SelectTrigger className="w-[130px] rounded-lg h-8 text-xs">
            <SelectValue placeholder="Broker" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              All Brokers
            </SelectItem>
            {brokerAccounts.map((b) => (
              <SelectItem key={b.id} value={b.id} className="text-xs">
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-slate-500 hover:text-slate-900"
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
