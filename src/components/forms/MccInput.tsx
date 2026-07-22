'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tag } from 'lucide-react';

export interface MccInputProps {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (val: string) => void;
  showHelperText?: boolean;
  label?: string;
  className?: string;
}

export function isValidMcc(mcc?: string | null): boolean {
  if (!mcc || mcc.trim() === '') return true;
  return /^\d{4}$/.test(mcc.trim());
}

export function MccInput({
  id = 'mcc',
  name = 'mcc',
  value,
  defaultValue,
  onChange,
  showHelperText = true,
  label = 'MCC Code (Optional)',
  className = '',
}: MccInputProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    setInternalValue(digits);
    onChange?.(digits);
  };

  const isControlled = value !== undefined;
  const currentVal = isControlled ? value : internalValue;

  return (
    <div className={`space-y-1 ${className}`}>
      <Label htmlFor={id} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
        <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        {label}
      </Label>
      <Input
        id={id}
        name={name}
        placeholder="e.g. 5411"
        maxLength={4}
        value={currentVal}
        onChange={handleChange}
        className="tabular-nums text-xs"
      />
      {showHelperText && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500">
          Optional 4-digit numeric Merchant Category Code (e.g. 5411 for Grocery Stores).
        </p>
      )}
    </div>
  );
}
