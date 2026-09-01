'use client';

import { FileText } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

interface GeneralInfoSectionProps {
  account?: Account;
  accountType: AccountType;
}

export function GeneralInfoSection({ account, accountType }: GeneralInfoSectionProps) {
  return (
    <div className="bg-white dark:bg-slate-900/60 rounded-xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-2">
      <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/40 pb-2">
        <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          General Information
        </h3>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">
          Account Name
        </Label>
        <Input
          id="name"
          name="name"
          autoComplete="off"
          placeholder={accountType === AccountType.BROKER ? 'e.g., Zerodha Demat' : 'e.g., HDFC Savings'}
          defaultValue={account?.name}
          required
          className="bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">
          Description (Optional)
        </Label>
        <Input
          id="description"
          name="description"
          placeholder="e.g., Primary Broking & Mutual Fund Account"
          defaultValue={account?.description}
          className="bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs"
        />
      </div>
    </div>
  );
}
