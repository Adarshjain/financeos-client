'use client';

import { Hash, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/lib/api/errorMessage';

import { useAccountIdentifiers } from './useAccountIdentifiers';

/**
 * Two modes:
 * - `accountId` set (edit form): identifiers are read and written through the
 *   API immediately.
 * - `pending`/`onPendingChange` (create form, no account yet): values are
 *   collected locally and saved by the account-create mutation once the
 *   account exists.
 */
interface AccountIdentifiersSectionProps {
  accountId?: string;
  pending?: string[];
  onPendingChange?: (values: string[]) => void;
}

const normalize = (raw: string) => raw.trim().replaceAll(/\s+/g, '');

export function AccountIdentifiersSection({
  accountId,
  pending = [],
  onPendingChange,
}: AccountIdentifiersSectionProps) {
  const {
    identifiers,
    isLoading,
    createIdentifier,
    isCreating,
    deleteIdentifier,
  } = useAccountIdentifiers(accountId);

  const [newValue, setNewValue] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isApiMode = Boolean(accountId);
  const rows = isApiMode
    ? identifiers.map((ident) => ({ key: ident.id, value: ident.value }))
    : pending.map((value) => ({ key: value, value }));

  const handleAdd = async () => {
    const clean = normalize(newValue);
    if (!clean) return;
    if (clean.length < 2 || clean.length > 32) {
      setErrorMessage('Identifier must be between 2 and 32 characters.');
      return;
    }
    setErrorMessage(null);

    if (!isApiMode) {
      if (pending.includes(clean)) {
        setErrorMessage(`"${clean}" is already in the list.`);
        return;
      }
      onPendingChange?.([...pending, clean]);
      setNewValue('');
      return;
    }

    try {
      await createIdentifier({ value: clean });
      setNewValue('');
      toast.success('Identifier alias added');
    } catch (err) {
      setErrorMessage(getErrorMessage(err, 'Failed to add identifier alias'));
    }
  };

  const handleRemove = async (key: string) => {
    if (!isApiMode) {
      onPendingChange?.(pending.filter((value) => value !== key));
      return;
    }
    setDeletingId(key);
    setErrorMessage(null);
    try {
      await deleteIdentifier(key);
      toast.success('Identifier alias removed');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to remove identifier'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900/60 rounded-xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-3">
      <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/40 pb-2">
        <Hash className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Email Identifier Aliases
        </h3>
      </div>

      <p className="text-2xs text-slate-500 dark:text-slate-400 leading-relaxed">
        Additional customer IDs, CRNs, or account digits from bank alert emails that map to this account.
      </p>

      {errorMessage && (
        <div
          role="alert"
          className="p-2.5 rounded-lg text-xs bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300"
        >
          {errorMessage}
        </div>
      )}

      {/* Existing identifiers list */}
      {isApiMode && isLoading ? (
        <div className="text-2xs text-slate-400 py-1">Loading identifiers...</div>
      ) : rows.length > 0 ? (
        <div className="space-y-1.5">
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs"
            >
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {row.value}
              </span>

              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={deletingId === row.key}
                onClick={() => handleRemove(row.key)}
                className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                aria-label={`Remove identifier ${row.value}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Inline add row */}
      <div className="pt-1">
        <Label className="text-2xs font-semibold text-slate-600 dark:text-slate-350 block mb-1.5">
          Add Identifier
        </Label>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="e.g. 1234 or CRN"
            maxLength={32}
            value={newValue}
            onChange={(e) => {
              setNewValue(e.target.value);
              setErrorMessage(null);
            }}
            onKeyDown={(e) => {
              // Enter adds the identifier instead of submitting the account form.
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleAdd();
              }
            }}
            className="flex-1 bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs h-8"
          />

          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={!newValue.trim() || isCreating}
            onClick={handleAdd}
            className="h-8 px-2.5 text-xs text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
