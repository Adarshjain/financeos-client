'use client';

import * as React from 'react';
import { JSX, useState } from 'react';

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DatePickerProps {
  trigger: JSX.Element;
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
}

export function DatePicker({ trigger, date, onSelect }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div>{trigger}</div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(date: Date | undefined) => {
            setOpen(false);
            onSelect(date);
          }}
          defaultMonth={date}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  );
}
