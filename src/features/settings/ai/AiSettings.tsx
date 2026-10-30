'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { GRID_GAP } from '@/components/ds/gridGap';
import type { LlmKeyDto } from '@/lib/api/types';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';

import { buildHealthRows, type KeyRow } from './aiModel';
import { DeleteKeyDialog } from './DeleteKeyDialog';
import { HealthCard } from './HealthCard';
import { buildProviderOptions } from './providersModel';
import { RoutingCard } from './RoutingCard';
import type { RoutingGroupEditor } from './routingGroupsModel';
import { useAiSettings } from './useAiSettings';
import { YourKeysCard } from './YourKeysCard';

// The key and routing editors are not in the page: each loads when it is first opened (see useLazyDialog).
const loadAddKeyDialog = () => import('./AddKeyDialog').then((m) => m.AddKeyDialog);
const loadRoutingEditorDialog = () => import('./RoutingEditorDialog').then((m) => m.RoutingEditorDialog);

/** The AI tab: your keys and routing on the left, model health on the right (phone: keys, routing, health). */
export function AiSettings() {
  const s = useAiSettings();

  // The hook's handlers are new every render; YourKeysCard memoises its columns on these, and a rebuilt
  // column set would close an open key Menu. Keep the callbacks stable and call the latest handlers.
  const latest = useRef(s);
  useEffect(() => {
    latest.current = s;
  });
  const onAdd = useCallback((providerId?: string) => latest.current.openAdd(providerId), []);
  const onTest = useCallback((key: LlmKeyDto) => void latest.current.testKey(key), []);
  const onMove = useCallback((row: KeyRow, delta: number) => void latest.current.moveKey(row, delta), []);

  const { Component: AddKeyDialog, run: runAddKey } = useLazyDialog(loadAddKeyDialog);
  const { Component: RoutingEditorDialog, run: runRouting } = useLazyDialog(loadRoutingEditorDialog);
  const addOpen = s.addOpen;
  useEffect(() => {
    // Once loaded the dialogs stay mounted, so their close animation plays; a failed load backs the open state out.
    if (addOpen) void runAddKey(() => undefined).then((ok) => !ok && latest.current.setAddOpen(false));
  }, [addOpen, runAddKey]);

  const providers = useMemo(() => buildProviderOptions(s.keysList), [s.keysList]);
  const healthRows = useMemo(
    () => buildHealthRows(s.health, s.routingOptions, s.routing),
    [s.health, s.routingOptions, s.routing]
  );

  const groups: RoutingGroupEditor[] = s.routing
    ? [
        {
          group: 'chat',
          dto: s.routing.chat,
          editing: s.chatEditing,
          draft: s.chatDraft,
          saving: s.savingChat,
          resetting: s.resettingChat,
          testing: s.testingChat,
          addError: s.chatAddError,
          onStart: () => s.startCustomizingGroup('chat', s.routing!.chat),
          onCancel: () => s.setChatEditing(false),
          onSave: () => void s.handleSaveRouting('chat'),
          onReset: () => void s.handleResetRouting('chat'),
          onMove: (i, d) => s.handleMoveDraftItem('chat', i, d),
          onRemove: (i) => s.handleRemoveDraftItem('chat', i),
          onAdd: (input) => s.handleAddCustomModel('chat', input),
        },
        {
          group: 'default',
          dto: s.routing.default,
          editing: s.defaultEditing,
          draft: s.defaultDraft,
          saving: s.savingDefault,
          resetting: s.resettingDefault,
          testing: s.testingDefault,
          addError: s.defaultAddError,
          onStart: () => s.startCustomizingGroup('default', s.routing!.default),
          onCancel: () => s.setDefaultEditing(false),
          onSave: () => void s.handleSaveRouting('default'),
          onReset: () => void s.handleResetRouting('default'),
          onMove: (i, d) => s.handleMoveDraftItem('default', i, d),
          onRemove: (i) => s.handleRemoveDraftItem('default', i),
          onAdd: (input) => s.handleAddCustomModel('default', input),
        },
      ]
    : [];
  const editing = groups.find((g) => g.editing) ?? null;
  const editingGroup = editing?.group ?? null;
  useEffect(() => {
    if (editingGroup) void runRouting(() => undefined).then((ok) => !ok && (editingGroup === 'chat' ? latest.current.setChatEditing(false) : latest.current.setDefaultEditing(false)));
  }, [editingGroup, runRouting]);
  const topError = s.error ?? s.actionError;

  return (
    <>
      {topError ? <Banner tone="danger" className="mb-space-8 desk:mb-space-16">{topError}</Banner> : null}
      <div className={`grid grid-cols-1 desk:grid-cols-12 items-start ${GRID_GAP}`}>
        <div className="desk:col-span-7">
          <YourKeysCard
            keys={s.keysList}
            testingKeyId={s.testingKeyId}
            onAdd={onAdd}
            onTest={onTest}
            onMove={onMove}
            onDelete={s.setKeyToDelete}
          />
        </div>
        {s.routing ? (
          <div className="desk:col-span-7">
            <RoutingCard groups={groups} error={editing ? null : s.routingError} />
          </div>
        ) : null}
        <div className="desk:col-span-5 desk:col-start-8 desk:row-start-1 desk:row-span-2">
          <HealthCard rows={healthRows} />
        </div>
      </div>

      {AddKeyDialog ? (
      <AddKeyDialog
        open={s.addOpen}
        onOpenChange={s.setAddOpen}
        providerId={s.addProviderId}
        onProviderChange={s.setAddProviderId}
        apiKey={s.newKey}
        onApiKeyChange={s.setNewKey}
        label={s.newLabel}
        onLabelChange={s.setNewLabel}
        submitting={s.submitting}
        error={s.addError}
        trainingWarning={s.trainingWarning}
        onSubmit={() => void s.submitAdd()}
      />
      ) : null}
      <DeleteKeyDialog
        keyToDelete={s.keyToDelete}
        deleting={s.deleting}
        onCancel={() => s.setKeyToDelete(null)}
        onConfirm={() => void s.confirmDelete()}
      />
      {RoutingEditorDialog ? (
      <RoutingEditorDialog
        group={editing}
        routingOptions={s.routingOptions}
        providers={providers}
        error={editing ? s.routingError : null}
      />
      ) : null}
    </>
  );
}
