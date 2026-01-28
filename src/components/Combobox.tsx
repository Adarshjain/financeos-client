import { CheckIcon, PlusIcon } from 'lucide-react';
import { useId, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type ComboboxOption = {
  value: string;
  label: string;
};

interface MultiComboboxProps {
  label?: string;
  placeholder?: string;
  options: ComboboxOption[];
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
  popoverClassName?: string;
  canCreate?: boolean;
  onCreate?: (value: string) => void;
};

export function Combobox({
                           label,
                           options,
                           value,
                           onChange,
                           className,
                           placeholder,
                           popoverClassName,
                           canCreate,
                           onCreate,
                         }: MultiComboboxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const hasExactMatch = options.some(
    o => o.label.toLowerCase() === search.toLowerCase(),
  );

  const showCreate =
    canCreate && search.length > 0 && !hasExactMatch;


  const toggleSelection = (val: string) => {
    onChange(value.includes(val) ? value.filter(v => v !== val) : [...value, val]);
  };

  const removeSelection = (val: string) => {
    onChange(value.filter(v => v !== val));
  };

  return (
    <div className={className ?? 'w-full space-y-2'}>
      {label && <Label htmlFor={id}>{label}</Label>}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="flex flex-wrap items-center gap-1 justify-center">
            {value.length > 0 ? (
              value.map(val => {
                const option = options.find(o => o.value === val);
                if (!option) return null;

                return (
                  <Badge key={val} variant="secondary" className="bg-black text-white text-base px-4">
                    <span onClick={e => {
                      e.stopPropagation();
                      removeSelection(val);
                    }}>{option.label}</span>
                  </Badge>
                );
              })
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <Badge variant="secondary" className="bg-black text-muted px-6">
              {value.length > 0
                ? <PlusIcon className="w-4" data-icon="inline-end" />
                : <><PlusIcon className="w-4 mr-2" data-icon="inline-end" />Categories</>
              }
            </Badge>
          </div>
        </PopoverTrigger>

        <PopoverContent
          onWheel={e => e.stopPropagation()}
          onTouchMove={e => e.stopPropagation()}
          className={cn('min-w-[350px] p-0', popoverClassName)}
          side="bottom"
          align="start"
        >
          <Command>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder="Search..."
            />
            <CommandList className="max-h-60 overflow-y-auto">
              {options.length === 0 && (
                <CommandEmpty>No results.</CommandEmpty>
              )}
              <CommandGroup>
                {options.map(option => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => toggleSelection(option.value)}
                  >
                    <span className="truncate">{option.label}</span>
                    {value.includes(option.value) && (
                      <CheckIcon size={16} className="ml-auto" />
                    )}
                  </CommandItem>
                ))}
                {showCreate && (
                  <CommandItem
                    value={search}
                    onSelect={() => {
                      onCreate?.(search);   // 👈 your handler
                      setSearch('');
                    }}
                    className="text-primary"
                  >
                    ➕ Create “{search}”
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
