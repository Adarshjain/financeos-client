'use client';

import { useGmailConnect as useGmailConnectCore } from '@/features/settings/connections/useGmailConnect';

/**
 * The Legacy Gmail settings hook: the shared one (moved to `features/settings/connections`) with
 * the browser `confirm()` Legacy uses before disconnecting a mailbox or deleting a sender.
 */
export function useGmailConnect() {
  const core = useGmailConnectCore();

  const handleDisconnect = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to disconnect this Gmail account? All syncing for this email will stop.'
      )
    ) {
      return;
    }
    await core.handleDisconnect(id);
  };

  const handleSenderDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sender from the allowlist?')) {
      return;
    }
    await core.handleSenderDelete(id);
  };

  return { ...core, handleDisconnect, handleSenderDelete };
}
