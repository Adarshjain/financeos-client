'use client';

import { useState } from 'react';

import { showToast } from '@/components/ds';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { LlmKeyDto } from '@/lib/api/types';

import { type KeyRow } from './aiModel';
import { PROVIDERS, showTrainingWarning } from './providers';
import { useLlmKeyMutations } from './useLlmKeyMutations';
import { useLlmKeysQueries } from './useLlmKeysQueries';
import { useLlmRoutingEditor } from './useLlmRoutingEditor';

/** Everything the AI tab does: the five reads, key add/delete/test/move, and the routing editor. */
export function useAiSettings() {
  const queries = useLlmKeysQueries();
  const { createMutation, deleteMutation, updatePositionMutation, testMutation } = useLlmKeyMutations();
  const routingEditor = useLlmRoutingEditor();

  // Delete and reorder failures show in the banner at the top, next to read errors.
  const [actionError, setActionError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addProviderId, setAddProviderId] = useState(PROVIDERS[0].id);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const [keyToDelete, setKeyToDelete] = useState<LlmKeyDto | null>(null);
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);

  const openAdd = (providerId?: string) => {
    setAddProviderId(providerId ?? PROVIDERS[0].id);
    setNewKey('');
    setNewLabel('');
    setAddError(null);
    setAddOpen(true);
  };

  const submitAdd = async () => {
    if (!newKey.trim()) return;
    setAddError(null);
    try {
      await createMutation.mutateAsync({
        provider: addProviderId,
        key: newKey.trim(),
        label: newLabel.trim() || undefined,
      });
      setAddOpen(false);
    } catch (err) {
      setAddError(getErrorMessage(err, "Couldn't add the API key. Try again."));
    }
  };

  const confirmDelete = async () => {
    if (!keyToDelete) return;
    setActionError(null);
    try {
      await deleteMutation.mutateAsync(keyToDelete.id);
      setKeyToDelete(null);
    } catch (err) {
      // Close the dialog so the error banner is not left behind the overlay.
      setKeyToDelete(null);
      setActionError(getErrorMessage(err, "Couldn't delete the API key. Try again."));
    }
  };

  const moveKey = async (row: KeyRow, delta: number) => {
    if (!row.key) return;
    const position = row.index + 1 + delta;
    if (position < 1 || position > row.count) return;
    setActionError(null);
    try {
      await updatePositionMutation.mutateAsync({ id: row.key.id, position });
    } catch (err) {
      setActionError(getErrorMessage(err, "Couldn't reorder the keys. Try again."));
    }
  };

  const testKey = async (key: LlmKeyDto) => {
    setTestingKeyId(key.id);
    try {
      const result = await testMutation.mutateAsync({ id: key.id });
      if (result.ok) showToast('Verified', { tone: 'success' });
      else showToast(result.error ? `Couldn't verify the key: ${result.error}` : "Couldn't verify the key. Try again.", { tone: 'danger' });
    } catch (err) {
      showToast(getErrorMessage(err, "Couldn't verify the key. Try again."), { tone: 'danger' });
    } finally {
      setTestingKeyId(null);
    }
  };

  return {
    ...queries,
    ...routingEditor,
    actionError,
    addOpen,
    setAddOpen,
    addProviderId,
    setAddProviderId,
    newKey,
    setNewKey,
    newLabel,
    setNewLabel,
    addError,
    submitting: createMutation.isPending,
    trainingWarning: showTrainingWarning(queries.catalog, addProviderId),
    keyToDelete,
    setKeyToDelete,
    deleting: deleteMutation.isPending,
    testingKeyId,
    openAdd,
    submitAdd,
    confirmDelete,
    moveKey,
    testKey,
  };
}
