'use client';

import { Hash, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { AccountIdentifierKind } from '@/lib/types';

import { useAccountIdentifiers } from './useAccountIdentifiers';

interface AccountIdentifiersSectionProps {
  accountId: string;
}

const KIND_LABELS: Record<AccountIdentifierKind, string> = {
  CUSTOMER_ID: 'Customer ID',
  ACCOUNT_NUMBER: 'Account No.',
  CRN: 'CRN',
  OTHER: 'Other',
};

const KIND_OPTIONS: { value: AccountIdentifierKind; label: string }[] = [
  { value: 'CUSTOMER_ID', label: 'Customer ID' },
  { value: 'ACCOUNT_NUMBER', label: 'Account No.' },
  { value: 'CRN', label: 'CRN' },
  { value: 'OTHER', label: 'Other' },
];

export function AccountIdentifiersSection({ accountId }: AccountIdentifiersSectionProps) {
  const {
    identifiers,
    isLoading,
    createIdentifier,
    isCreating,
    deleteIdentifier,
  } = useAccountIdentifiers(accountId);

  const [newValue, setNewValue] = useState('');
  const [newKind, setNewKind] = useState<AccountIdentifierKind>('CUSTOMER_ID');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newValue.trim().replaceAll(/\s+/g, '');
    if (!clean) return;

    setErrorMessage(null);
    try {
      await createIdentifier({ value: clean, kind: newKind });
      setNewValue('');
      toast.success('Identifier alias added');
    } catch (err) {
      setErrorMessage(getErrorMessage(err, 'Failed to add identifier alias'));
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setErrorMessage(null);
    try {
      await deleteIdentifier(id);
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
      {isLoading ? (
        <div className="text-2xs text-slate-400 py-1">Loading identifiers...</div>
      ) : identifiers.length > 0 ? (
        <div className="space-y-1.5">
          {identifiers.map((ident) => (
            <div
              key={ident.id}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {ident.value}
                </span>
                <Badge variant="outline" className="text-2xs py-0 px-1.5 border-slate-200 dark:border-slate-700">
                  {KIND_LABELS[ident.kind] ?? ident.kind}
                </Badge>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={deletingId === ident.id}
                onClick={() => handleDelete(ident.id)}
                className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                aria-label={`Remove identifier ${ident.value}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Inline add form */}
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
            className="flex-1 bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs h-8"
          />

          <Select
            value={newKind}
            onValueChange={(v) => setNewKind(v as AccountIdentifierKind)}
          >
            <SelectTrigger className="w-32 h-8 text-xs bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KIND_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
