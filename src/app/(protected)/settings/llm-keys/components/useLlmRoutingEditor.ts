'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { api } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { LlmRoutingDto, LlmRoutingGroupDto, Schemas } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

// No dedicated named export for this one in @/lib/api/types (unlike its
// sibling DTOs above) — same generated schema, reached via Schemas directly.
type RoutingEntryRequest = Schemas['RoutingEntryRequest'];

type GroupType = 'chat' | 'default';

interface DraftState {
  editing: boolean;
  draft: RoutingEntryRequest[];
}

const INITIAL_DRAFTS: Record<GroupType, DraftState> = {
  chat: { editing: false, draft: [] },
  default: { editing: false, draft: [] },
};

/**
 * Draft/save/reset state for the two routing groups (chat, default). Kept as
 * one keyed-by-group state object internally, then flattened back into the
 * `chatX`/`defaultX` fields `LlmKeysManager.tsx` and `RoutingGroupCard`
 * already consume, so neither needed to change shape.
 */
export function useLlmRoutingEditor() {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<GroupType, DraftState>>(INITIAL_DRAFTS);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ group: GroupType; op: 'save' | 'reset' } | null>(null);

  const applyGroupUpdate = (groupType: GroupType, groupDto: LlmRoutingGroupDto) => {
    qc.setQueryData(keys.settings.llmRouting(), (current: LlmRoutingDto | null | undefined) =>
      current ? { ...current, [groupType]: groupDto } : current
    );
    // A routing change can flip which options are "available" elsewhere too.
    qc.invalidateQueries({ queryKey: keys.settings.all });
  };

  const saveMutation = useMutation({
    mutationFn: ({ group, entries }: { group: GroupType; entries: RoutingEntryRequest[] }) =>
      api
        .PUT('/api/v1/llm/routing/{group}', { params: { path: { group } }, body: { entries } })
        .then((r) => r.data!),
  });

  const resetMutation = useMutation({
    mutationFn: (group: GroupType) =>
      api.POST('/api/v1/llm/routing/{group}/reset', { params: { path: { group } } }).then((r) => r.data!),
  });

  const setEditing = (groupType: GroupType, editing: boolean) => {
    setDrafts((prev) => ({ ...prev, [groupType]: { ...prev[groupType], editing } }));
  };

  const startCustomizingGroup = (groupType: GroupType, groupDto: LlmRoutingGroupDto) => {
    const draft: RoutingEntryRequest[] = groupDto.entries.map((e) => ({ optionId: e.optionId }));
    setDrafts((prev) => ({ ...prev, [groupType]: { editing: true, draft } }));
  };

  const handleMoveDraftItem = (groupType: GroupType, index: number, delta: number) => {
    setDrafts((prev) => {
      const list = [...prev[groupType].draft];
      const targetIndex = index + delta;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      [list[index], list[targetIndex]] = [list[targetIndex], list[index]];
      return { ...prev, [groupType]: { ...prev[groupType], draft: list } };
    });
  };

  const handleSaveRouting = async (groupType: GroupType) => {
    const draft = drafts[groupType].draft;
    if (draft.length === 0) return;
    setRoutingError(null);
    setPending({ group: groupType, op: 'save' });
    try {
      const updated = await saveMutation.mutateAsync({ group: groupType, entries: draft });
      applyGroupUpdate(groupType, updated);
      setEditing(groupType, false);
    } catch (err) {
      setRoutingError(getErrorMessage(err, 'Failed to save routing'));
    } finally {
      setPending(null);
    }
  };

  const handleResetRouting = async (groupType: GroupType) => {
    setRoutingError(null);
    setPending({ group: groupType, op: 'reset' });
    try {
      const updated = await resetMutation.mutateAsync(groupType);
      applyGroupUpdate(groupType, updated);
      setEditing(groupType, false);
    } catch (err) {
      setRoutingError(getErrorMessage(err, 'Failed to reset routing'));
    } finally {
      setPending(null);
    }
  };

  return {
    routingError,
    chatEditing: drafts.chat.editing,
    chatDraft: drafts.chat.draft,
    savingChat: pending?.group === 'chat' && pending.op === 'save',
    resettingChat: pending?.group === 'chat' && pending.op === 'reset',
    setChatEditing: (editing: boolean) => setEditing('chat', editing),
    defaultEditing: drafts.default.editing,
    defaultDraft: drafts.default.draft,
    savingDefault: pending?.group === 'default' && pending.op === 'save',
    resettingDefault: pending?.group === 'default' && pending.op === 'reset',
    setDefaultEditing: (editing: boolean) => setEditing('default', editing),
    startCustomizingGroup,
    handleSaveRouting,
    handleResetRouting,
    handleMoveDraftItem,
  };
}
