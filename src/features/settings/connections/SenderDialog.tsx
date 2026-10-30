'use client';

import React, { useState } from 'react';

import { ConfirmDialog, Dialog } from '@/components/ds/Dialog/Dialog';
import { TextField } from '@/components/ds/TextField/TextField';
import { SettingsToggle } from '@/components/organisms/SettingsToggle/SettingsToggle';
import type { GmailSenderResponse } from '@/lib/api/types';

const FORM_ID = 'sender-form';

interface SenderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSender: GmailSenderResponse | null;
  senderName: string;
  setSenderName: (v: string) => void;
  senderAddress: string;
  setSenderAddress: (v: string) => void;
  senderEnabled: boolean;
  setSenderEnabled: (v: boolean) => void;
  submittingSender: boolean;
  onSubmit: (e: React.FormEvent) => void;
  /** Runs the delete after the confirm dialog; this dialog closes only when it did not return false. */
  onDelete: (id: string) => Promise<boolean | void> | boolean | void;
}

/** Add or edit an allowed sender; Delete (edit only) confirms first. */
export function SenderDialog({
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
  onDelete,
}: SenderDialogProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!editingSender) return;
    setDeleting(true);
    try {
      const ok = await onDelete(editingSender.id);
      if (ok !== false) {
        setConfirmingDelete(false);
        onOpenChange(false);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <Dialog.Content
          size="sm"
          title={editingSender ? 'Edit allowed sender' : 'Add allowed sender'}
          tertiary={
            editingSender
              ? { label: 'Delete', tone: 'danger', disabled: submittingSender, onSelect: () => setConfirmingDelete(true) }
              : undefined
          }
          secondary={{ label: 'Cancel', onSelect: () => onOpenChange(false) }}
          primary={{
            label: submittingSender ? 'Saving…' : editingSender ? 'Save sender' : 'Add sender',
            type: 'submit',
            form: FORM_ID,
            disabled: submittingSender,
          }}
        >
          <Dialog.Body>
            <form id={FORM_ID} className="flex flex-col gap-space-8 desk:gap-space-12" onSubmit={onSubmit}>
              <TextField
                label="Sender name"
                optional
                name="name"
                placeholder="e.g., HDFC Bank Alerts"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
              />
              <TextField
                label="Sender email address"
                name="senderAddress"
                type="email"
                placeholder="e.g., alerts@hdfcbank.net"
                value={senderAddress}
                onChange={(e) => setSenderAddress(e.target.value)}
                required
              />
              <SettingsToggle
                label="Enable ingestion for this sender"
                checked={senderEnabled}
                onCheckedChange={setSenderEnabled}
              />
            </form>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={(next) => {
          if (!next && !deleting) setConfirmingDelete(false);
        }}
        title="Delete sender?"
        description="Mail from this address is no longer read. Transactions already imported stay. This can't be undone."
        confirmLabel="Delete"
        confirmLoading={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
