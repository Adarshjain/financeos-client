'use client';

import React, { useEffect, useState } from 'react';

import type {
  LlmBucketHealthDto,
  LlmKeyDto,
  LlmRoutingDto,
  LlmRoutingGroupDto,
  ProviderCatalogDto,
  RoutingEntryRequest,
  RoutingOptionDto,
  TestKeyResponse,
} from '@/lib/llmKey.types';

import {
  createLlmKey,
  deleteLlmKey,
  getLlmCatalog,
  getLlmHealth,
  getLlmRouting,
  getLlmRoutingOptions,
  listLlmKeys,
  resetLlmRouting,
  testLlmKey,
  updateLlmKeyPosition,
  updateLlmRouting,
} from '../actions';
import { ProviderConfig } from './ProviderKeysCard';

interface UseLlmKeysManagerProps {
  initialKeys?: LlmKeyDto[];
}

export function useLlmKeysManager({ initialKeys }: UseLlmKeysManagerProps) {
  const [keys, setKeys] = useState<LlmKeyDto[]>(initialKeys || []);
  const [catalog, setCatalog] = useState<ProviderCatalogDto[]>([]);
  const [routingOptions, setRoutingOptions] = useState<RoutingOptionDto[]>([]);
  const [routing, setRouting] = useState<LlmRoutingDto | null>(null);
  const [health, setHealth] = useState<LlmBucketHealthDto[]>([]);
  const [loading, setLoading] = useState(!initialKeys);
  const [error, setError] = useState<string | null>(null);

  // Add Key Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderConfig | null>(null);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Delete Confirm Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<LlmKeyDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reorder customization state per provider
  const [customizingProviders, setCustomizingProviders] = useState<
    Record<string, boolean>
  >({});

  // Test Key state
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{
    [id: string]: TestKeyResponse;
  }>({});

  // Routing editing state
  const [chatEditing, setChatEditing] = useState(false);
  const [chatDraft, setChatDraft] = useState<RoutingEntryRequest[]>([]);
  const [savingChat, setSavingChat] = useState(false);
  const [resettingChat, setResettingChat] = useState(false);

  const [defaultEditing, setDefaultEditing] = useState(false);
  const [defaultDraft, setDefaultDraft] = useState<RoutingEntryRequest[]>([]);
  const [savingDefault, setSavingDefault] = useState(false);
  const [resettingDefault, setResettingDefault] = useState(false);

  const [routingError, setRoutingError] = useState<string | null>(null);

  const refreshAllData = async () => {
    try {
      setError(null);
      const [keysRes, catalogRes, optionsRes, routingRes, healthRes] =
        await Promise.all([
          listLlmKeys(),
          getLlmCatalog(),
          getLlmRoutingOptions(),
          getLlmRouting(),
          getLlmHealth(),
        ]);

      if (keysRes.success && keysRes.data) {
        setKeys(keysRes.data);
      }
      if (catalogRes.success && catalogRes.data) {
        setCatalog(catalogRes.data);
      }
      if (optionsRes.success && optionsRes.data) {
        setRoutingOptions(optionsRes.data);
      }
      if (routingRes.success && routingRes.data) {
        setRouting(routingRes.data);
      }
      if (healthRes.success && healthRes.data) {
        setHealth(healthRes.data);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to load configuration';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  const handleOpenAddModal = (provider: ProviderConfig) => {
    setSelectedProvider(provider);
    setNewKey('');
    setNewLabel('');
    setAddError(null);
    setAddModalOpen(true);
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider || !newKey.trim()) return;

    try {
      setSubmitting(true);
      setAddError(null);
      const res = await createLlmKey({
        provider: selectedProvider.id,
        key: newKey.trim(),
        label: newLabel.trim() || undefined,
      });
      if (res.success) {
        setAddModalOpen(false);
        await refreshAllData();
      } else if (!res.success && res.error) {
        setAddError(res.error.message);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to add API key';
      setAddError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (key: LlmKeyDto) => {
    setKeyToDelete(key);
    setDeleteModalOpen(true);
  };

  const handleDeleteKey = async () => {
    if (!keyToDelete) return;
    try {
      setDeleting(true);
      const res = await deleteLlmKey(keyToDelete.id);
      if (res.success) {
        setDeleteModalOpen(false);
        setKeyToDelete(null);
        await refreshAllData();
      } else if (!res.success && res.error) {
        setError(res.error.message);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to delete API key';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleMove = async (key: LlmKeyDto, delta: number) => {
    const providerKeys = keys.filter(
      (k) => k.provider.toLowerCase() === key.provider.toLowerCase()
    );
    const currentIndex = providerKeys.findIndex((k) => k.id === key.id);
    if (currentIndex === -1) return;

    const newPosition = currentIndex + 1 + delta;
    if (newPosition < 1 || newPosition > providerKeys.length) return;

    try {
      const res = await updateLlmKeyPosition(key.id, newPosition);
      if (res.success && res.data) {
        setKeys(res.data);
      } else if (!res.success && res.error) {
        setError(res.error.message);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to reorder key';
      setError(msg);
    }
  };

  const handleTestKey = async (key: LlmKeyDto) => {
    try {
      setTestingKeyId(key.id);
      const res = await testLlmKey(key.id);
      if (res.success && res.data) {
        setTestResults((prev) => ({ ...prev, [key.id]: res.data! }));
      } else if (!res.success && res.error) {
        setTestResults((prev) => ({
          ...prev,
          [key.id]: { ok: false, error: res.error.message },
        }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Test failed';
      setTestResults((prev) => ({
        ...prev,
        [key.id]: { ok: false, error: msg },
      }));
    } finally {
      setTestingKeyId(null);
    }
  };

  const startCustomizingGroup = (
    groupType: 'chat' | 'default',
    groupDto: LlmRoutingGroupDto
  ) => {
    const draft: RoutingEntryRequest[] = groupDto.entries.map((e) => ({
      optionId: e.optionId,
    }));
    if (groupType === 'chat') {
      setChatDraft(draft);
      setChatEditing(true);
    } else {
      setDefaultDraft(draft);
      setDefaultEditing(true);
    }
  };

  const handleSaveRouting = async (groupType: 'chat' | 'default') => {
    const draft = groupType === 'chat' ? chatDraft : defaultDraft;
    if (draft.length === 0) return;

    try {
      setRoutingError(null);
      if (groupType === 'chat') setSavingChat(true);
      else setSavingDefault(true);

      const res = await updateLlmRouting(groupType, { entries: draft });
      if (res.success && res.data) {
        setRouting((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            [groupType]: res.data!,
          };
        });
        if (groupType === 'chat') setChatEditing(false);
        else setDefaultEditing(false);
        await refreshAllData();
      } else if (!res.success && res.error) {
        setRoutingError(res.error.message);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to save routing';
      setRoutingError(msg);
    } finally {
      if (groupType === 'chat') setSavingChat(false);
      else setSavingDefault(false);
    }
  };

  const handleResetRouting = async (groupType: 'chat' | 'default') => {
    try {
      setRoutingError(null);
      if (groupType === 'chat') setResettingChat(true);
      else setResettingDefault(true);

      const res = await resetLlmRouting(groupType);
      if (res.success && res.data) {
        setRouting((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            [groupType]: res.data!,
          };
        });
        if (groupType === 'chat') setChatEditing(false);
        else setDefaultEditing(false);
        await refreshAllData();
      } else if (!res.success && res.error) {
        setRoutingError(res.error.message);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to reset routing';
      setRoutingError(msg);
    } finally {
      if (groupType === 'chat') setResettingChat(false);
      else setResettingDefault(false);
    }
  };

  const handleMoveDraftItem = (
    groupType: 'chat' | 'default',
    index: number,
    delta: number
  ) => {
    const list =
      groupType === 'chat' ? [...chatDraft] : [...defaultDraft];
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const item = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = item;

    if (groupType === 'chat') setChatDraft(list);
    else setDefaultDraft(list);
  };

  const toggleCustomizingProvider = (providerId: string) => {
    setCustomizingProviders((prev) => ({
      ...prev,
      [providerId]: !prev[providerId],
    }));
  };

  const selectedProviderCatalog = catalog.find(
    (c) => c.id.toLowerCase() === selectedProvider?.id.toLowerCase()
  );
  const showTrainingWarning = selectedProviderCatalog?.models.some(
    (m) =>
      m.free &&
      (m.trainsOnData === 'yes' || m.trainsOnData === 'unknown')
  );

  return {
    keys,
    catalog,
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
    submitting,
    addError,
    deleteModalOpen,
    setDeleteModalOpen,
    keyToDelete,
    deleting,
    customizingProviders,
    testingKeyId,
    testResults,
    chatEditing,
    setChatEditing,
    chatDraft,
    savingChat,
    resettingChat,
    defaultEditing,
    setDefaultEditing,
    defaultDraft,
    savingDefault,
    resettingDefault,
    routingError,
    showTrainingWarning,
    handleOpenAddModal,
    handleAddKey,
    handleOpenDeleteModal,
    handleDeleteKey,
    handleMove,
    handleTestKey,
    startCustomizingGroup,
    handleSaveRouting,
    handleResetRouting,
    handleMoveDraftItem,
    toggleCustomizingProvider,
  };
}
