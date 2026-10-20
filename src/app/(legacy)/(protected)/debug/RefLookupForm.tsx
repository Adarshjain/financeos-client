'use client';

import { Search } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RefLookupFormProps {
  initialRef?: string;
  initialType?: string;
  onSearch: (ref: string, type: string) => void;
  isLoading?: boolean;
}

export function RefLookupForm({
  initialRef = '',
  initialType = 'auto',
  onSearch,
  isLoading = false,
}: RefLookupFormProps) {
  const [ref, setRef] = useState(initialRef);
  const [type, setType] = useState(initialType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRef = ref.trim();
    if (cleanRef) {
      onSearch(cleanRef, type);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
      <div className="relative flex-1">
        <Input
          type="text"
          placeholder="Enter requestId or errorId (e.g. HM6HK5G6)..."
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          className="font-mono text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        />
      </div>

      <div className="w-full sm:w-44">
        <Select value={type} onValueChange={(val) => setType(val)}>
          <SelectTrigger className="w-full h-10 text-xs">
            <SelectValue placeholder="Auto-detect" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto-detect</SelectItem>
            <SelectItem value="errorId">Error ID (8 chars)</SelectItem>
            <SelectItem value="requestId">Request ID</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isLoading || !ref.trim()} className="sm:w-auto">
        <Search className="w-4 h-4 mr-1.5" />
        Look up
      </Button>
    </form>
  );
}
