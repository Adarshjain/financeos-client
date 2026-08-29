'use client';

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  MoreVertical,
  Play,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Trash2,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from './actions';

interface ProviderConfig {
  id: string;
  name: string;
  getKeyUrl: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'gemini',
    name: 'Gemini',
    getKeyUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'groq',
    name: 'Groq',
    getKeyUrl: 'https://console.groq.com/keys',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    getKeyUrl: 'https://openrouter.ai/keys',
  },
];

interface LlmKeysManagerProps {
  initialKeys?: LlmKeyDto[];
}

export function LlmKeysManager({ initialKeys }: LlmKeysManagerProps) {
  const [keys, setKeys] = useState<LlmKeyDto[]>(initialKeys || []);
  const [catalog, setCatalog] = useState<ProviderCatalogDto[]>([]);
  const [routingOptions, setRoutingOptions] = useState<RoutingOptionDto[]>([]);
  const [routing, setRouting] = useState<LlmRoutingDto | null>(null);
  const [health, setHealth] = useState<LlmBucketHealthDto[]>([]);
  const [loading, setLoading] = useState(!initialKeys);
  const [error, setError] = useState<string | null>(null);

  // Add Key Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderConfig | null>(null);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Delete Confirm Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<LlmKeyDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reorder customization state per provider
  const [customizingProviders, setCustomizingProviders] = useState<Record<string, boolean>>({});

  // Test Key state
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{ [id: string]: TestKeyResponse }>({});

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
      const [keysRes, catalogRes, optionsRes, routingRes, healthRes] = await Promise.all([
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
      const msg = err instanceof Error ? err.message : 'Failed to load configuration';
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
      const msg = err instanceof Error ? err.message : 'Failed to add API key';
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
      const msg = err instanceof Error ? err.message : 'Failed to delete API key';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleMove = async (key: LlmKeyDto, delta: number) => {
    const providerKeys = keys.filter(
      (k) => k.provider.toLowerCase() === key.provider.toLowerCase(),
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
      const msg = err instanceof Error ? err.message : 'Failed to reorder key';
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
      setTestResults((prev) => ({ ...prev, [key.id]: { ok: false, error: msg } }));
    } finally {
      setTestingKeyId(null);
    }
  };

  // Start customizing a group
  const startCustomizingGroup = (groupType: 'chat' | 'default', groupDto: LlmRoutingGroupDto) => {
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

  // Save custom routing for a group
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
      const msg = err instanceof Error ? err.message : 'Failed to save routing';
      setRoutingError(msg);
    } finally {
      if (groupType === 'chat') setSavingChat(false);
      else setSavingDefault(false);
    }
  };

  // Reset routing to default
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
      const msg = err instanceof Error ? err.message : 'Failed to reset routing';
      setRoutingError(msg);
    } finally {
      if (groupType === 'chat') setResettingChat(false);
      else setResettingDefault(false);
    }
  };

  const handleMoveDraftItem = (
    groupType: 'chat' | 'default',
    index: number,
    delta: number,
  ) => {
    const list = groupType === 'chat' ? [...chatDraft] : [...defaultDraft];
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const item = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = item;

    if (groupType === 'chat') setChatDraft(list);
    else setDefaultDraft(list);
  };

  // Check training disclosure for the selected provider modal
  const selectedProviderCatalog = catalog.find(
    (c) => c.id.toLowerCase() === selectedProvider?.id.toLowerCase(),
  );
  const showTrainingWarning = selectedProviderCatalog?.models.some(
    (m) => m.free && (m.trainsOnData === 'yes' || m.trainsOnData === 'unknown'),
  );

  if (loading) {
    return (
      <div className="space-y-2 py-4">
        <p className="text-slate-500 text-sm">Loading AI Configuration &amp; Keys...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-20">
      {error && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle className="font-medium">Error</AlertTitle>
          <AlertDescription className="text-sm mt-1">{error}</AlertDescription>
        </Alert>
      )}

      {/* Section 1: API Keys Cards */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">API Keys</h2>
          <p className="text-xs text-slate-500">
            Bring your own API keys to run models. Keys are encrypted at rest with AES-GCM.
          </p>
        </div>

        {PROVIDERS.map((provider) => {
          const providerKeys = keys.filter(
            (k) => k.provider.toLowerCase() === provider.id.toLowerCase(),
          );
          const isCustomizing = !!customizingProviders[provider.id];

          return (
            <Card key={provider.id} className="border border-slate-200 dark:border-slate-800">
              <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="font-semibold text-slate-900 dark:text-white text-base">
                    {provider.name}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  {providerKeys.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setCustomizingProviders((prev) => ({
                          ...prev,
                          [provider.id]: !prev[provider.id],
                        }))
                      }
                    >
                      <Sliders className="h-3.5 w-3.5 mr-1" />
                      {isCustomizing ? 'Done' : 'Customise'}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenAddModal(provider)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 py-0">
                {providerKeys.length === 0 ? (
                  <div className="text-center py-3">
                    <p className="text-slate-500 text-sm">No {provider.name} keys configured.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {providerKeys.map((key, idx) => {
                      const testResult = testResults[key.id];
                      const isTesting = testingKeyId === key.id;

                      return (
                        <div key={key.id} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="font-mono text-xs font-medium">
                              #{key.position}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1 flex-col">
                                <div className="font-medium text-slate-900 dark:text-white text-sm">
                                  {key.label || `${provider.name} Key`}
                                </div>
                                <div className="text-xs font-mono text-slate-400">
                                  •••• {key.keyLast4}
                                </div>
                              </div>
                              {key.status === 'ACTIVE' ? (
                                <Badge
                                  variant="outline"
                                  className="text-xs border-emerald-300 text-emerald-700 dark:text-emerald-400"
                                >
                                  Active
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-xs border-rose-300 text-rose-700 dark:text-rose-400"
                                >
                                  Invalid
                                </Badge>
                              )}

                              {testResult && (
                                <span
                                  className={`text-2xs font-medium px-2 py-0.5 rounded ${
                                    testResult.ok
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                  }`}
                                >
                                  {testResult.ok ? 'Verified' : 'Verification failed'}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {isCustomizing && (
                              <div className="flex items-center gap-0.5 mr-1">
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  disabled={idx === 0}
                                  onClick={() => handleMove(key, -1)}
                                  title="Move up"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  disabled={idx === providerKeys.length - 1}
                                  onClick={() => handleMove(key, 1)}
                                  title="Move down"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  className="h-7 w-7 p-0"
                                  title="Key options"
                                >
                                  <MoreVertical className="h-3.5 w-3.5 text-slate-500" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem
                                  disabled={isTesting}
                                  onClick={() => handleTestKey(key)}
                                  className="cursor-pointer"
                                >
                                  {isTesting ? (
                                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                                  ) : (
                                    <Play className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                  )}
                                  <span>Test Key</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenDeleteModal(key)}
                                  className="text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/20 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  <span>Delete Key</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Section 2: AI Routing Preferences */}
      <div className="space-y-1 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">AI Routing Preferences</h2>
        </div>

        <Alert className="py-2">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs text-slate-600 dark:text-slate-400">
            Tried in order. Options without a key are skipped automatically.
          </AlertDescription>
        </Alert>

        {routingError && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription className="text-sm">{routingError}</AlertDescription>
          </Alert>
        )}

        {routing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chat Group Card */}
            <Card className="border border-slate-200 dark:border-slate-800">
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold">{routing.chat.displayName}</CardTitle>
                    {routing.chat.usingDefaults ? (
                      <Badge variant="secondary" className="text-2xs font-normal">
                        Default
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-2xs font-normal border-blue-300 text-blue-700 dark:text-blue-400">
                        Custom
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-2xs mt-0.5">
                    {routing.chat.description}
                  </CardDescription>
                </div>

                {!chatEditing ? (
                  <div className="flex items-center gap-1">
                    {!routing.chat.usingDefaults && (
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={resettingChat}
                        onClick={() => handleResetRouting('chat')}
                        title="Reset to default"
                      >
                        {resettingChat ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                        Reset
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => startCustomizingGroup('chat', routing.chat)}
                    >
                      <Sliders className="h-3 w-3 mr-1" />
                      {routing.chat.usingDefaults ? 'Customise' : 'Edit'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="xs"
                      disabled={savingChat}
                      onClick={() => setChatEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      size="xs"
                      disabled={savingChat || chatDraft.length === 0}
                      onClick={() => handleSaveRouting('chat')}
                    >
                      {savingChat ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                      Save
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="px-4 py-2 border-t border-slate-100 dark:border-slate-800">
                {!chatEditing ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {routing.chat.entries.map((entry) => {
                      const cooled = health.find(
                        (h) =>
                          h.provider.toLowerCase() === entry.provider.toLowerCase() &&
                          (h.model === entry.model || !entry.model) &&
                          h.inCooldown,
                      );

                      return (
                        <div key={entry.position} className="flex items-center justify-between py-2 text-xs">
                          <div className="flex items-start gap-2">
                            <span className="font-mono text-2xs text-slate-400 pt-0.5">#{entry.position}</span>
                            <div className="flex flex-col">
                              <span className={`font-medium ${entry.hasKey ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                {entry.optionLabel}
                              </span>
                              {!entry.hasKey && (
                                <span className="text-2xs text-slate-400 dark:text-slate-500">Not configured</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {cooled && cooled.cooldownUntil && (
                              <Badge variant="outline" className="text-2xs border-amber-300 text-amber-700 dark:text-amber-400">
                                Cooldown until {new Date(cooled.cooldownUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Badge>
                            )}
                            {entry.hasKey && (
                              <Badge variant="outline" className="text-2xs border-emerald-300 text-emerald-700 dark:text-emerald-400">
                                Ready
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1.5 py-1">
                    {chatDraft.map((item, idx) => {
                      const option = routingOptions.find((o) => o.id === item.optionId);
                      const hasKey = option?.available ?? false;

                      return (
                        <div key={item.optionId} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-md border border-slate-200 dark:border-slate-800">
                          <div className="flex flex-col gap-0.5">
                            <Button
                              variant="ghost"
                              size="xs"
                              disabled={idx === 0}
                              onClick={() => handleMoveDraftItem('chat', idx, -1)}
                              className="h-5 w-5 p-0"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              disabled={idx === chatDraft.length - 1}
                              onClick={() => handleMoveDraftItem('chat', idx, 1)}
                              className="h-5 w-5 p-0"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>

                          <span className="font-mono text-2xs text-slate-400">#{idx + 1}</span>

                          <div className="flex flex-col flex-1 min-w-0">
                            <span className={`text-xs font-medium truncate ${hasKey ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                              {option?.label || item.optionId}
                            </span>
                            {!hasKey && (
                              <span className="text-2xs text-slate-400 dark:text-slate-500">Not configured</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Everything Else Group Card */}
            <Card className="border border-slate-200 dark:border-slate-800">
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold">{routing.default.displayName}</CardTitle>
                    {routing.default.usingDefaults ? (
                      <Badge variant="secondary" className="text-2xs font-normal">
                        Default
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-2xs font-normal border-blue-300 text-blue-700 dark:text-blue-400">
                        Custom
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-2xs mt-0.5">
                    {routing.default.description}
                  </CardDescription>
                </div>

                {!defaultEditing ? (
                  <div className="flex items-center gap-1">
                    {!routing.default.usingDefaults && (
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={resettingDefault}
                        onClick={() => handleResetRouting('default')}
                        title="Reset to default"
                      >
                        {resettingDefault ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                        Reset
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => startCustomizingGroup('default', routing.default)}
                    >
                      <Sliders className="h-3 w-3 mr-1" />
                      {routing.default.usingDefaults ? 'Customise' : 'Edit'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="xs"
                      disabled={savingDefault}
                      onClick={() => setDefaultEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      size="xs"
                      disabled={savingDefault || defaultDraft.length === 0}
                      onClick={() => handleSaveRouting('default')}
                    >
                      {savingDefault ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                      Save
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="px-4 py-2 border-t border-slate-100 dark:border-slate-800">
                {!defaultEditing ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {routing.default.entries.map((entry) => {
                      const cooled = health.find(
                        (h) =>
                          h.provider.toLowerCase() === entry.provider.toLowerCase() &&
                          (h.model === entry.model || !entry.model) &&
                          h.inCooldown,
                      );

                      return (
                        <div key={entry.position} className="flex items-center justify-between py-2 text-xs">
                          <div className="flex items-start gap-2">
                            <span className="font-mono text-2xs text-slate-400 pt-0.5">#{entry.position}</span>
                            <div className="flex flex-col">
                              <span className={`font-medium ${entry.hasKey ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                {entry.optionLabel}
                              </span>
                              {!entry.hasKey && (
                                <span className="text-2xs text-slate-400 dark:text-slate-500">Not configured</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {cooled && cooled.cooldownUntil && (
                              <Badge variant="outline" className="text-2xs border-amber-300 text-amber-700 dark:text-amber-400">
                                Cooldown until {new Date(cooled.cooldownUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Badge>
                            )}
                            {entry.hasKey && (
                              <Badge variant="outline" className="text-2xs border-emerald-300 text-emerald-700 dark:text-emerald-400">
                                Ready
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1.5 py-1">
                    {defaultDraft.map((item, idx) => {
                      const option = routingOptions.find((o) => o.id === item.optionId);
                      const hasKey = option?.available ?? false;

                      return (
                        <div key={item.optionId} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-md border border-slate-200 dark:border-slate-800">
                          <div className="flex flex-col gap-0.5">
                            <Button
                              variant="ghost"
                              size="xs"
                              disabled={idx === 0}
                              onClick={() => handleMoveDraftItem('default', idx, -1)}
                              className="h-5 w-5 p-0"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              disabled={idx === defaultDraft.length - 1}
                              onClick={() => handleMoveDraftItem('default', idx, 1)}
                              className="h-5 w-5 p-0"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>

                          <span className="font-mono text-2xs text-slate-400">#{idx + 1}</span>

                          <div className="flex flex-col flex-1 min-w-0">
                            <span className={`text-xs font-medium truncate ${hasKey ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                              {option?.label || item.optionId}
                            </span>
                            {!hasKey && (
                              <span className="text-2xs text-slate-400 dark:text-slate-500">Not configured</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Add Key Dialog */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md sm:p-6">
          <DialogHeader>
            <DialogTitle>Add {selectedProvider?.name} Key</DialogTitle>
          </DialogHeader>

          <form id="add-llm-key-form" onSubmit={handleAddKey}>
            <DialogBody className="space-y-4 py-2">
              {addError && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">{addError}</AlertDescription>
                </Alert>
              )}

              {showTrainingWarning && (
                <div className="rounded-md border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-300">
                  <div className="font-medium flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    Training &amp; Privacy Disclosure
                  </div>
                  <p className="text-2xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    Financial data sent to this provider&apos;s free tier may be used by the provider to train AI models. Paid tiers do not train on customer prompts.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="llm_key_secret_input" className="text-sm font-semibold">
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
                      {selectedProvider.name} <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="llm_key_label_input" className="text-sm font-semibold">
                  Label <span className="text-slate-400 text-xs font-normal">(Optional)</span>
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
                onClick: () => setAddModalOpen(false),
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

      {/* Delete Key Confirmation Dialog */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-sm p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Delete API Key?</DialogTitle>
          </DialogHeader>

          <DialogBody className="py-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to delete {keyToDelete?.label || `${keyToDelete?.provider} key`} (•••• {keyToDelete?.keyLast4})?
            </p>
          </DialogBody>

          <DialogFooter
            secondaryAction={{
              label: 'Cancel',
              onClick: () => setDeleteModalOpen(false),
              disabled: deleting,
            }}
            primaryAction={{
              label: deleting ? 'Deleting...' : 'Delete Key',
              variant: 'destructive',
              onClick: handleDeleteKey,
              disabled: deleting,
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
