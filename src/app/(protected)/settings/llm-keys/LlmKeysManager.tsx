'use client';

import { Info, ShieldAlert } from 'lucide-react';
import React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { AddKeyDialog } from './components/AddKeyDialog';
import { DeleteKeyDialog } from './components/DeleteKeyDialog';
import {
  ProviderConfig,
  ProviderKeysCard,
} from './components/ProviderKeysCard';
import { RoutingGroupCard } from './components/RoutingGroupCard';
import { useLlmKeysManager } from './components/useLlmKeysManager';

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

export function LlmKeysManager() {
  const {
    keys,
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
  } = useLlmKeysManager();

  if (loading) {
    return (
      <div className="space-y-2 py-4">
        <p className="text-slate-500 text-sm">
          Loading AI Configuration &amp; Keys...
        </p>
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
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            API Keys
          </h2>
          <p className="text-xs text-slate-500">
            Bring your own API keys to run models. Keys are encrypted at rest
            with AES-GCM.
          </p>
        </div>

        {PROVIDERS.map((provider) => {
          const providerKeys = keys.filter(
            (k) => k.provider.toLowerCase() === provider.id.toLowerCase()
          );
          const isCustomizing = !!customizingProviders[provider.id];

          return (
            <ProviderKeysCard
              key={provider.id}
              provider={provider}
              providerKeys={providerKeys}
              isCustomizing={isCustomizing}
              onToggleCustomizing={() =>
                toggleCustomizingProvider(provider.id)
              }
              onOpenAddModal={handleOpenAddModal}
              onOpenDeleteModal={handleOpenDeleteModal}
              onMove={handleMove}
              onTestKey={handleTestKey}
              testingKeyId={testingKeyId}
              testResults={testResults}
            />
          );
        })}
      </div>

      {/* Section 2: AI Routing Preferences */}
      <div className="space-y-1 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            AI Routing Preferences
          </h2>
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
            <AlertDescription className="text-sm">
              {routingError}
            </AlertDescription>
          </Alert>
        )}

        {routing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RoutingGroupCard
              groupType="chat"
              groupDto={routing.chat}
              editing={chatEditing}
              draft={chatDraft}
              saving={savingChat}
              resetting={resettingChat}
              health={health}
              routingOptions={routingOptions}
              onStartCustomizing={() =>
                startCustomizingGroup('chat', routing.chat)
              }
              onCancelEditing={() => setChatEditing(false)}
              onSaveRouting={() => handleSaveRouting('chat')}
              onResetRouting={() => handleResetRouting('chat')}
              onMoveDraftItem={(idx, delta) =>
                handleMoveDraftItem('chat', idx, delta)
              }
            />

            <RoutingGroupCard
              groupType="default"
              groupDto={routing.default}
              editing={defaultEditing}
              draft={defaultDraft}
              saving={savingDefault}
              resetting={resettingDefault}
              health={health}
              routingOptions={routingOptions}
              onStartCustomizing={() =>
                startCustomizingGroup('default', routing.default)
              }
              onCancelEditing={() => setDefaultEditing(false)}
              onSaveRouting={() => handleSaveRouting('default')}
              onResetRouting={() => handleResetRouting('default')}
              onMoveDraftItem={(idx, delta) =>
                handleMoveDraftItem('default', idx, delta)
              }
            />
          </div>
        )}
      </div>

      <AddKeyDialog
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        selectedProvider={selectedProvider}
        newKey={newKey}
        setNewKey={setNewKey}
        newLabel={newLabel}
        setNewLabel={setNewLabel}
        submitting={submitting}
        addError={addError}
        showTrainingWarning={showTrainingWarning}
        onSubmit={handleAddKey}
      />

      <DeleteKeyDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        keyToDelete={keyToDelete}
        deleting={deleting}
        onDeleteKey={handleDeleteKey}
      />
    </div>
  );
}
