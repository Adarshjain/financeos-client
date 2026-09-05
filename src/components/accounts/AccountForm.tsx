'use client';

import { CreditCard, Landmark, TrendingUp, Wallet } from 'lucide-react';

import { DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { AccountDetailsSection } from './account-form/AccountDetailsSection';
import { AccountIdentifiersSection } from './account-form/AccountIdentifiersSection';
import { AccountTypeButton, AccountTypeSelector } from './account-form/AccountTypeSelector';
import { CleanupConfirmDialog } from './account-form/CleanupConfirmDialog';
import { ACCOUNT_TYPE_CONFIG, COMMON_BROKERS } from './account-form/constants';
import { DangerZoneSection } from './account-form/DangerZoneSection';
import { DeleteAccountDialog } from './account-form/DeleteAccountDialog';
import { GeneralInfoSection } from './account-form/GeneralInfoSection';
import { LifecycleSection } from './account-form/LifecycleSection';
import { SyncConfigSection } from './account-form/SyncConfigSection';
import { useAccountForm } from './account-form/useAccountForm';

interface AccountFormProps {
  account?: Account;
  onSuccess?: () => void;
  onClose?: () => void;
}

export function AccountForm({ account, onSuccess, onClose }: AccountFormProps) {
  const {
    isUpdateMode,
    accountType,
    setAccountType,
    excludeFromNetAsset,
    setExcludeFromNetAsset,
    showPassword,
    setShowPassword,
    isSubmitting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    isDeleting,
    confirmCleanup,
    setConfirmCleanup,
    isClosingAccount,
    isReopeningAccount,
    closeOnDate,
    setCloseOnDate,
    showCloseInline,
    setShowCloseInline,
    defaultIngestFromDate,
    handleCloseAccount,
    handleReopenAccount,
    handleDelete,
    handleSubmit,
    handleConfirmCleanup,
  } = useAccountForm({ account, onSuccess, onClose });

  return (
    <>
      <CleanupConfirmDialog
        confirmCleanup={confirmCleanup}
        onOpenChange={(open) => {
          if (!open) setConfirmCleanup(null);
        }}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirmCleanup}
      />

      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-950">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          {accountType === AccountType.BANK_ACCOUNT ? (
            <Landmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          ) : accountType === AccountType.CREDIT_CARD ? (
            <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          ) : accountType === AccountType.BROKER ? (
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          ) : (
            <Wallet className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          )}
          {isUpdateMode ? 'Edit Account' : 'Create Account'}
          <AccountTypeButton
            label={ACCOUNT_TYPE_CONFIG[accountType]?.label ?? 'Account'}
            icon={ACCOUNT_TYPE_CONFIG[accountType]?.icon ?? Landmark}
            selected={true}
            disabled
            activeClassName={
              ACCOUNT_TYPE_CONFIG[accountType]?.activeClassName ??
              'bg-slate-50 border-slate-500 text-slate-700 font-semibold'
            }
          />
        </h2>
      </div>

      <DialogBody className="py-3 bg-slate-50/40 dark:bg-slate-950/20">
        <form id="account-form" onSubmit={handleSubmit} autoComplete="off" className="space-y-2">
          {/* Account Type Selection */}
          <AccountTypeSelector
            accountType={accountType}
            setAccountType={setAccountType}
            isUpdateMode={isUpdateMode}
          />

          {/* Card 1: General Info */}
          <GeneralInfoSection account={account} accountType={accountType} />

          {/* Card 2: Account Details */}
          <AccountDetailsSection
            account={account}
            accountType={accountType}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
          />

          {/* Card 2b: Email Identifier Aliases (Only in Edit mode for Bank and Card accounts) */}
          {isUpdateMode && account && (accountType === AccountType.BANK_ACCOUNT || accountType === AccountType.CREDIT_CARD) && (
            <AccountIdentifiersSection accountId={account.id} />
          )}

          {/* Card 3: Configurations & Sync */}
          <SyncConfigSection
            account={account}
            defaultIngestFromDate={defaultIngestFromDate}
            excludeFromNetAsset={excludeFromNetAsset}
            setExcludeFromNetAsset={setExcludeFromNetAsset}
          />

          {/* Card 4: Account Lifecycle (Close / Reopen) (Only in Edit mode) */}
          {isUpdateMode && account && (
            <LifecycleSection
              account={account}
              isSubmitting={isSubmitting}
              isClosingAccount={isClosingAccount}
              isReopeningAccount={isReopeningAccount}
              closeOnDate={closeOnDate}
              setCloseOnDate={setCloseOnDate}
              showCloseInline={showCloseInline}
              setShowCloseInline={setShowCloseInline}
              onCloseAccount={handleCloseAccount}
              onReopenAccount={handleReopenAccount}
            />
          )}

          {/* Card 5: Danger Zone (Only in Edit mode) */}
          {isUpdateMode && account && (
            <DangerZoneSection
              isSubmitting={isSubmitting}
              isDeleting={isDeleting}
              onDeleteClick={() => setShowDeleteConfirm(true)}
            />
          )}

          <datalist id="broker-providers">
            {COMMON_BROKERS.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </form>
      </DialogBody>

      <DialogFooter
        primaryAction={{
          label: isSubmitting
            ? isUpdateMode
              ? 'Saving...'
              : 'Creating...'
            : isUpdateMode
              ? 'Save Changes'
              : 'Create Account',
          type: 'submit',
          form: 'account-form',
          disabled: isSubmitting,
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => onClose?.(),
        }}
      />

      {showDeleteConfirm && account && (
        <DeleteAccountDialog
          account={account}
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          isDeleting={isDeleting}
          isClosingAccount={isClosingAccount}
          onCloseInstead={handleCloseAccount}
          onDeletePermanently={handleDelete}
        />
      )}
    </>
  );
}
