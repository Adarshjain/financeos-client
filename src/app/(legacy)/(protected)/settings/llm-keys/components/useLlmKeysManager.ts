'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';

import { type ProviderConfig, showTrainingWarning as shouldWarnAboutTraining } from '@/features/settings/ai/providers';
import { useLlmKeyMutations } from '@/features/settings/ai/useLlmKeyMutations';
import { useLlmKeysQueries } from '@/features/settings/ai/useLlmKeysQueries';
import { useLlmRoutingEditor } from '@/features/settings/ai/useLlmRoutingEditor';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { LlmKeyDto, TestKeyResponse } from '@/lib/api/types';


/**
 * Composes the five reads (`useLlmKeysQueries`), the key CRUD/test/reorder
 * mutations (`useLlmKeyMutations`) and the routing draft editor
 * (`useLlmRoutingEditor`) into the same flat API `LlmKeysManager` and its
 * dialogs already consume.
 */
export function useLlmKeysManager() {
  const { keysList, catalog, routingOptions, routing, health, loading, error: readError } = useLlmKeysQueries();
  const { createMutation, deleteMutation, updatePositionMutation, testMutation } = useLlmKeyMutations();
  const routingEditor = useLlmRoutingEditor();

  // Delete/reorder failures render in the same top-of-page Alert the read
  // errors do (matches the pre-migration single `error` state).
  const [actionError, setActionError] = useState<string | null>(null);
  const error = readError ?? actionError;

  // Add Key Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderConfig | null>(null);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  // Delete Confirm Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<LlmKeyDto | null>(null);

  // Reorder customization state per provider
  const [customizingProviders, setCustomizingProviders] = useState<Record<string, boolean>>({});

  // Test Key state
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{ [id: string]: TestKeyResponse }>({});

  const handleOpenAddModal = (provider: ProviderConfig) => {
    setSelectedProvider(provider);
    setNewKey('');
    setNewLabel('');
    setAddError(null);
    setAddModalOpen(true);
  };

  const handleAddKey = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProvider || !newKey.trim()) return;

    setAddError(null);
    try {
      await createMutation.mutateAsync({
        provider: selectedProvider.id,
        key: newKey.trim(),
        label: newLabel.trim() || undefined,
      });
      setAddModalOpen(false);
    } catch (err) {
      setAddError(getErrorMessage(err, 'Failed to add API key'));
    }
  };

  const handleOpenDeleteModal = (key: LlmKeyDto) => {
    setKeyToDelete(key);
    setDeleteModalOpen(true);
  };

  const handleDeleteKey = async () => {
    if (!keyToDelete) return;
    setActionError(null);
    try {
      await deleteMutation.mutateAsync(keyToDelete.id);
      setDeleteModalOpen(false);
      setKeyToDelete(null);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to delete API key'));
    }
  };

  const handleMove = async (key: LlmKeyDto, delta: number) => {
    const providerKeys = keysList.filter((k) => k.provider.toLowerCase() === key.provider.toLowerCase());
    const currentIndex = providerKeys.findIndex((k) => k.id === key.id);
    if (currentIndex === -1) return;

    const newPosition = currentIndex + 1 + delta;
    if (newPosition < 1 || newPosition > providerKeys.length) return;

    setActionError(null);
    try {
      await updatePositionMutation.mutateAsync({ id: key.id, position: newPosition });
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to reorder key'));
    }
  };

  const handleTestKey = async (key: LlmKeyDto) => {
    setTestingKeyId(key.id);
    try {
      const result = await testMutation.mutateAsync({ id: key.id });
      setTestResults((prev) => ({ ...prev, [key.id]: result }));
    } catch (err) {
      setTestResults((prev) => ({ ...prev, [key.id]: { ok: false, error: getErrorMessage(err, 'Test failed') } }));
    } finally {
      setTestingKeyId(null);
    }
  };

  const toggleCustomizingProvider = (providerId: string) => {
    setCustomizingProviders((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const showTrainingWarning = shouldWarnAboutTraining(catalog, selectedProvider?.id);

  return {
    keys: keysList,
    routingOptions,
    routing,
    health,
    loading,
    error,
    addModalOpen,
    setAddModalOpen,
    selectedProvider,
    newKey,
    setNewKey,
    newLabel,
    setNewLabel,
    submitting: createMutation.isPending,
    addError,
    deleteModalOpen,
    setDeleteModalOpen,
    keyToDelete,
    deleting: deleteMutation.isPending,
    customizingProviders,
    testingKeyId,
    testResults,
    ...routingEditor,
    showTrainingWarning,
    handleOpenAddModal,
    handleAddKey,
    handleOpenDeleteModal,
    handleDeleteKey,
    handleMove,
    handleTestKey,
    toggleCustomizingProvider,
  };
}
