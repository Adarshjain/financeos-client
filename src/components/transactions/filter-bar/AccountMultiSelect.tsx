'use client';

import { ChevronDown, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';

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

import { groupAccountsByType } from './filterBar.helpers';

interface AccountMultiSelectProps {
  accounts: Account[];
  selectableAccounts: Account[];
  activeAccountIds: string[];
  isAllAccountsSelected: boolean;
  onAccountToggle: (id: string) => void;
  onToggleAllAccounts: () => void;
}

export function AccountMultiSelect({
  accounts,
  selectableAccounts,
  activeAccountIds,
  isAllAccountsSelected,
  onAccountToggle,
  onToggleAllAccounts,
}: AccountMultiSelectProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [query, setQuery] = useState('');
  const groups = useMemo(() => groupAccountsByType(selectableAccounts), [selectableAccounts]);
  const isSomeSelected = selectableAccounts.some((a) => activeAccountIds.includes(a.id));

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
          <CommandInput
            placeholder="Search accounts..."
            className="h-9 text-xs"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-72 p-1">
            <CommandEmpty className="py-4 text-xs text-center text-slate-500">
              No account found.
            </CommandEmpty>
            {/* Select-all acts on every account, so hide it while a search narrows the list. */}
            {!query && selectableAccounts.length > 0 && (
              <CommandGroup className="border-b border-slate-100 dark:border-slate-800">
                <CommandItem
                  value="__select_all__"
                  onSelect={onToggleAllAccounts}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold cursor-pointer touch-manipulation"
                >
                  <Checkbox
                    checked={isAllAccountsSelected ? true : isSomeSelected ? 'indeterminate' : false}
                    className="pointer-events-none rounded-md"
                  />
                  <span>{isAllAccountsSelected ? 'Deselect all' : 'Select all'}</span>
                </CommandItem>
              </CommandGroup>
            )}
            {groups.map((group) => (
              <CommandGroup key={group.type} heading={group.label}>
                {group.accounts.map((acc) => {
                  const isSelected = activeAccountIds.includes(acc.id);
                  return (
                    <CommandItem
                      key={acc.id}
                      value={acc.name}
                      onSelect={() => onAccountToggle(acc.id)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs cursor-pointer touch-manipulation"
                    >
                      <Checkbox checked={isSelected} className="pointer-events-none rounded-md" />
                      <span className="font-medium text-slate-800 dark:text-slate-200">{acc.name}</span>
                      {acc.closedOn && (
                        <span className="text-2xs text-rose-500 font-semibold">(Closed)</span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
