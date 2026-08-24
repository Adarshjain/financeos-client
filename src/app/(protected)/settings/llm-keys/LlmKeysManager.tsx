'use client';

import { ArrowDown, ArrowUp, ExternalLink, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { LlmKeyDto } from '@/lib/llmKey.types';

import { createLlmKey, deleteLlmKey, listLlmKeys, updateLlmKeyPosition } from './actions';

interface ProviderConfig {
  id: string;
  name: string;
  getKeyUrl: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    getKeyUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    getKeyUrl: 'https://cloud.cerebras.ai/platform',
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

  const refreshKeys = async () => {
    try {
      setError(null);
      const res = await listLlmKeys();
      if (res.success && res.data) {
        setKeys(res.data);
      } else if (!res.success && res.error) {
        setError(res.error.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load API keys';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialKeys) {
      refreshKeys();
    }
  }, [initialKeys]);

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
        await refreshKeys();
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
        await refreshKeys();
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

  if (loading) {
    return (
      <div className="space-y-2">
        <p className="text-slate-500 text-sm">Loading AI API Keys...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle className="font-medium">Error</AlertTitle>
          <AlertDescription className="text-sm mt-1">{error}</AlertDescription>
        </Alert>
      )}

      {PROVIDERS.map((provider) => {
        const providerKeys = keys.filter(
          (k) => k.provider.toLowerCase() === provider.id.toLowerCase(),
        );

        return (
          <Card key={provider.id} className="border border-slate-200 dark:border-slate-800">
            <CardHeader className="py-2 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="font-semibold text-slate-900 dark:text-white text-base flex items-center gap-2">
                {provider.name}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenAddModal(provider)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Key
              </Button>
            </CardHeader>
            <CardContent className="p-4 py-0">
              {providerKeys.length === 0 ? (
                <div className="text-center py-3">
                  <p className="text-slate-500 text-sm">No {provider.name} keys configured.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {providerKeys.map((key, idx) => (
                    <div key={key.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="font-mono text-xs font-medium">
                          #{key.position}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-2 flex-col">
                            <div className="font-medium text-slate-900 dark:text-white text-sm">
                            {key.label || `${provider.name} Key`}
                          </div>
                            <div className="text-xs font-mono text-slate-400">
                            •••• {key.keyLast4}
                          </div>
                          </div>
                          {key.status === 'ACTIVE' ? (
                            <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700 dark:text-emerald-400">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-rose-300 text-rose-700 dark:text-rose-400">
                              Invalid
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-0">
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
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleOpenDeleteModal(key)}
                          className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          title="Delete key"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

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
