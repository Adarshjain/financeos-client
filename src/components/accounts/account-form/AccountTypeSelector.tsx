'use client';

import { Shield } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { AccountType } from '@/lib/types';
import { cn } from '@/lib/utils';

import { ACCOUNT_TYPE_CONFIG } from './constants';

interface AccountTypeButtonProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  selected: boolean;
  disabled?: boolean;
  activeClassName: string;
  onClick?: () => void;
}

export function AccountTypeButton({
  label,
  icon: Icon,
  selected,
  disabled,
  activeClassName,
  onClick,
}: AccountTypeButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-2 py-2 px-2 rounded-xl border-2 text-center transition-all shadow-sm',
        selected
          ? activeClassName
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850',
        disabled && 'opacity-60 cursor-not-allowed border-dashed'
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="text-xs">{label}</span>
    </button>
  );
}

const ALL_ACCOUNT_TYPES: AccountType[] = [
  AccountType.BANK_ACCOUNT,
  AccountType.CREDIT_CARD,
  AccountType.BROKER,
  AccountType.GENERIC,
];

// Tailwind needs the full class name present in source, so no template strings.
const DESKTOP_COLUMNS: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
};

interface AccountTypeSelectorProps {
  accountType: AccountType;
  setAccountType: (type: AccountType) => void;
  isUpdateMode: boolean;
  /** Types offered in create mode. Defaults to every type; a host that can
   * only use some of them (the transaction form cannot record against a
   * broker account) narrows the list rather than letting the user create an
   * account it then cannot pick. */
  allowedTypes?: AccountType[];
}

export function AccountTypeSelector({
  accountType,
  setAccountType,
  isUpdateMode,
  allowedTypes,
}: AccountTypeSelectorProps) {
  if (isUpdateMode) return null;

  const types = ALL_ACCOUNT_TYPES.filter((t) => !allowedTypes || allowedTypes.includes(t));

  return (
    <div className="space-y-2">
      <Label className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
        <Shield className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        Account Type
      </Label>
      <div className={cn('grid gap-2 grid-cols-2', DESKTOP_COLUMNS[types.length] ?? 'sm:grid-cols-4')}>
        {types.map((type) => {
          const config = ACCOUNT_TYPE_CONFIG[type];
          return (
            <AccountTypeButton
              key={type}
              label={config.label}
              icon={config.icon}
              selected={accountType === type}
              activeClassName={config.activeClassName}
              onClick={() => setAccountType(type)}
            />
          );
        })}
      </div>
    </div>
  );
}
