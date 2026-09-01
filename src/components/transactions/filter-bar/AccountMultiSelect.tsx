'use client';

import { ChevronDown, Wallet } from 'lucide-react';
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

interface AccountMultiSelectProps {
  accounts: Account[];
  selectableAccounts: Account[];
  activeAccountIds: string[];
  onAccountToggle: (id: string) => void;
}

export function AccountMultiSelect({
  accounts,
  selectableAccounts,
  activeAccountIds,
  onAccountToggle,
}: AccountMultiSelectProps) {
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <Popover open={accountOpen} onOpenChange={setAccountOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={activeAccountIds.length > 0 ? 'filter-active' : 'filter'}
          size="pill"
        >
          <Wallet className="h-3 w-3 opacity-70" />
          <span>
            {activeAccountIds.length === 0
              ? 'Account'
              : activeAccountIds.length === 1
              ? accounts.find((a) => a.id === activeAccountIds[0])?.name || '1 Account'
              : `Accounts (${activeAccountIds.length})`}
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
              {selectableAccounts.map((acc) => {
                const isSelected = activeAccountIds.includes(acc.id);
                return (
                  <CommandItem
                    key={acc.id}
                    onSelect={() => onAccountToggle(acc.id)}
                    className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer touch-manipulation"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox checked={isSelected} className="pointer-events-none rounded-md" />
                      <span className="font-medium text-slate-800 dark:text-slate-200">{acc.name}</span>
                      {acc.closedOn && (
                        <span className="text-2xs text-rose-500 font-semibold">(Closed)</span>
                      )}
                    </div>
                    {acc.type && (
                      <span className="text-2xs text-slate-400 uppercase tracking-wider">
                        {acc.type}
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
