'use client';

import React from 'react';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import type { GmailSenderResponse } from '@/lib/types';

interface GmailSenderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSender: GmailSenderResponse | null;
  senderName: string;
  setSenderName: (name: string) => void;
  senderAddress: string;
  setSenderAddress: (addr: string) => void;
  senderEnabled: boolean;
  setSenderEnabled: (enabled: boolean) => void;
  submittingSender: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function GmailSenderDialog({
  open,
  onOpenChange,
  editingSender,
  senderName,
  setSenderName,
  senderAddress,
  setSenderAddress,
  senderEnabled,
  setSenderEnabled,
  submittingSender,
  onSubmit,
}: GmailSenderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingSender ? 'Edit Allowed Sender' : 'Add Allowed Sender'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <form
            id="sender-form"
            onSubmit={onSubmit}
            className="space-y-2 pt-2"
          >
            <FormField
              label="Sender Name (Optional)"
              name="name"
              placeholder="e.g., HDFC Bank Alerts"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
            />

            <FormField
              label="Sender Email Address"
              name="senderAddress"
              type="email"
              placeholder="e.g., alerts@hdfcbank.net"
              value={senderAddress}
              onChange={(e) => setSenderAddress(e.target.value)}
              required
            />

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="senderEnabled"
                checked={senderEnabled}
                onChange={(e) => setSenderEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label
                htmlFor="senderEnabled"
                className="text-sm font-medium text-slate-700 dark:text-slate-300 select-none"
              >
                Enable Ingestion for this Sender
              </label>
            </div>
          </form>
        </DialogBody>

        <DialogFooter
          primaryAction={{
            label: submittingSender ? 'Saving...' : 'Save Sender',
            type: 'submit',
            form: 'sender-form',
            disabled: submittingSender,
          }}
          secondaryAction={{
            label: 'Cancel',
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
