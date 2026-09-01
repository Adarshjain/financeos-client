'use client';

import { AlertTriangle, ExternalLink } from 'lucide-react';
import React from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { ProviderConfig } from './ProviderKeysCard';

interface AddKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProvider: ProviderConfig | null;
  newKey: string;
  setNewKey: (key: string) => void;
  newLabel: string;
  setNewLabel: (label: string) => void;
  submitting: boolean;
  addError: string | null;
  showTrainingWarning: boolean | undefined;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddKeyDialog({
  open,
  onOpenChange,
  selectedProvider,
  newKey,
  setNewKey,
  newLabel,
  setNewLabel,
  submitting,
  addError,
  showTrainingWarning,
  onSubmit,
}: AddKeyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md sm:p-6">
        <DialogHeader>
          <DialogTitle>Add {selectedProvider?.name} Key</DialogTitle>
        </DialogHeader>

        <form id="add-llm-key-form" onSubmit={onSubmit}>
          <DialogBody className="space-y-4 py-2">
            {addError && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">
                  {addError}
                </AlertDescription>
              </Alert>
            )}

            {showTrainingWarning && (
              <div className="rounded-md border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-300">
                <div className="font-medium flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  Training &amp; Privacy Disclosure
                </div>
                <p className="text-2xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  Financial data sent to this provider&apos;s free tier may be
                  used by the provider to train AI models. Paid tiers do not
                  train on customer prompts.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label
                htmlFor="llm_key_secret_input"
                className="text-sm font-semibold"
              >
                API Key
              </Label>
              <Input
                id="llm_key_secret_input"
                name="llm_key_secret_input"
                type="password"
                placeholder="Paste API key"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                required
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                data-1p-ignore="true"
                data-lpignore="true"
                readOnly
                onFocus={(e) => e.target.removeAttribute('readonly')}
                className="font-mono text-sm"
              />
              {selectedProvider && (
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                  Get key from{' '}
                  <a
                    href={selectedProvider.getKeyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 font-medium"
                  >
                    {selectedProvider.name}{' '}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="llm_key_label_input"
                className="text-sm font-semibold"
              >
                Label{' '}
                <span className="text-slate-400 text-xs font-normal">
                  (Optional)
                </span>
              </Label>
              <Input
                id="llm_key_label_input"
                name="llm_key_label_input"
                type="text"
                placeholder="e.g. Project Alpha"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                autoComplete="off"
                className="text-sm"
              />
            </div>
          </DialogBody>

          <DialogFooter
            secondaryAction={{
              label: 'Cancel',
              onClick: () => onOpenChange(false),
              disabled: submitting,
            }}
            primaryAction={{
              label: submitting ? 'Saving...' : 'Save Key',
              type: 'submit',
              form: 'add-llm-key-form',
              disabled: submitting || !newKey.trim(),
            }}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
