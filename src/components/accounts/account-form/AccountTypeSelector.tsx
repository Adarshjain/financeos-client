'use client';

import { CreditCard, Landmark, Shield, TrendingUp, Wallet } from 'lucide-react';

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

interface AccountTypeSelectorProps {
  accountType: AccountType;
  setAccountType: (type: AccountType) => void;
  isUpdateMode: boolean;
}

export function AccountTypeSelector({
  accountType,
  setAccountType,
  isUpdateMode,
}: AccountTypeSelectorProps) {
  if (isUpdateMode) return null;

  return (
    <div className="space-y-2">
      <Label className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
        <Shield className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        Account Type
      </Label>
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
        <AccountTypeButton
          label={ACCOUNT_TYPE_CONFIG.bank_account.label ?? 'Account'}
          icon={Landmark}
          selected={accountType === AccountType.BANK_ACCOUNT}
          activeClassName={ACCOUNT_TYPE_CONFIG[AccountType.BANK_ACCOUNT].activeClassName}
          onClick={() => setAccountType(AccountType.BANK_ACCOUNT)}
        />
        <AccountTypeButton
          label={ACCOUNT_TYPE_CONFIG.credit_card.label ?? 'Account'}
          icon={CreditCard}
          selected={accountType === AccountType.CREDIT_CARD}
          activeClassName={ACCOUNT_TYPE_CONFIG[AccountType.CREDIT_CARD].activeClassName}
          onClick={() => setAccountType(AccountType.CREDIT_CARD)}
        />
        <AccountTypeButton
          label={ACCOUNT_TYPE_CONFIG.broker.label ?? 'Account'}
          icon={TrendingUp}
          selected={accountType === AccountType.BROKER}
          activeClassName={ACCOUNT_TYPE_CONFIG[AccountType.BROKER].activeClassName}
          onClick={() => setAccountType(AccountType.BROKER)}
        />
        <AccountTypeButton
          label={ACCOUNT_TYPE_CONFIG.generic.label ?? 'Account'}
          icon={Wallet}
          selected={accountType === AccountType.GENERIC}
          activeClassName={ACCOUNT_TYPE_CONFIG[AccountType.GENERIC].activeClassName}
          onClick={() => setAccountType(AccountType.GENERIC)}
        />
      </div>
    </div>
  );
}
