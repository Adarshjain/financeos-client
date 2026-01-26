import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react';
import { useId, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type ComboboxOption = {
  value: string;
  label: string;
};

type MultiComboboxProps = {
  label?: string;
  placeholder?: string;
  options: ComboboxOption[];
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
  popoverClassName?: string;
};

export function MultiCombobox({ label, options, value, onChange, className, placeholder, popoverClassName }: MultiComboboxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);

  const toggleSelection = (val: string) => {
    onChange(value.includes(val) ? value.filter(v => v !== val) : [...value, val]);
  };

  const removeSelection = (val: string) => {
    onChange(value.filter(v => v !== val));
  };

  return (
    <div className={className ?? 'w-full max-w-xs space-y-2'}>
      {label && <Label htmlFor={id}>{label}</Label>}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-auto min-h-8 w-full justify-between hover:bg-transparent"
          >
            <div className="flex flex-wrap items-center gap-1 pr-2.5">
              {value.length > 0 ? (
                value.map(val => {
                  const option = options.find(o => o.value === val);
                  if (!option) return null;

                  return (
                    <Badge key={val} variant="outline" className="rounded-sm">
                      {option.label}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-4"
                        onClick={e => {
                          e.stopPropagation();
                          removeSelection(val);
                        }}
                        asChild
                      >
                        <span>
                          <XIcon className="size-3" />
                        </span>
                      </Button>
                    </Badge>
                  );
                })
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>

            <ChevronsUpDownIcon
              className="shrink-0 text-muted-foreground/80"
              aria-hidden="true"
            />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          onWheel={e => e.stopPropagation()}
          className={cn('w-(--radix-popper-anchor-width) p-0', popoverClassName)}
        >
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandList className="max-h-60 overflow-y-auto">
              <CommandEmpty>No results found.</CommandEmpty>
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
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
