'use client';

import { Check, ChevronDown, Wallet } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Account } from '@/lib/account.types';
import { formatDate } from '@/lib/utils';

interface ReviewAccountMultiSelectProps {
  accounts: Account[];
  selectableAccounts: Account[];
  appliedAccountIds: string[];
  isAllAccountsSelected: boolean;
  onAccountToggle: (id: string) => void;
  onSelectAllAccounts: () => void;
}

export function ReviewAccountMultiSelect({
  accounts,
  selectableAccounts,
  appliedAccountIds,
  isAllAccountsSelected,
  onAccountToggle,
  onSelectAllAccounts,
}: ReviewAccountMultiSelectProps) {
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <Popover open={accountOpen} onOpenChange={setAccountOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={!isAllAccountsSelected ? 'filter-active' : 'filter'}
          size="pill"
          className="gap-1"
        >
          <Wallet className="h-3 w-3 opacity-70" />
          <span>
            {isAllAccountsSelected
              ? 'Accounts'
              : appliedAccountIds.length === 1
              ? accounts.find((a) => a.id === appliedAccountIds[0])?.name || '1 Account'
              : `Accounts (${appliedAccountIds.length})`}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50 ml-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0 rounded-2xl shadow-xl overflow-hidden">
        <Command>
          <CommandInput placeholder="Search accounts..." className="h-9 text-xs" />
          <CommandList className="max-h-56 p-1">
            <CommandEmpty className="py-4 text-xs text-center text-slate-500">
              No account found.
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={onSelectAllAccounts}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border-b border-slate-100 dark:border-slate-800 mb-1"
              >
                <span>Select All Accounts</span>
                {isAllAccountsSelected && (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                )}
              </CommandItem>
              {selectableAccounts.map((acc) => {
                const isSelected = appliedAccountIds.includes(acc.id);
                const lastStatementDate =
                  'lastStatementDate' in acc && acc.lastStatementDate
                    ? formatDate((acc as { lastStatementDate: string }).lastStatementDate)
                    : null;
                return (
                  <CommandItem
                    key={acc.id}
                    onSelect={() => onAccountToggle(acc.id)}
                    className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer touch-manipulation"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected}
                        className="pointer-events-none rounded-md"
                      />
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {acc.name}
                      </span>
                      {acc.closedOn && (
                        <span className="text-2xs text-rose-500 font-semibold">
                          (Closed)
                        </span>
                      )}
                    </div>
                    {lastStatementDate && (
                      <span className="text-2xs text-slate-400">
                        Cutoff: {lastStatementDate}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
