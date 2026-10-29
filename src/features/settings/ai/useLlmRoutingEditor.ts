'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { resetLlmRouting, saveLlmRouting, testLlmModel } from '@/features/settings/ai/llmActions';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { LlmRoutingDto, LlmRoutingGroupDto, Schemas } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

// No dedicated named export for these in @/lib/api/types (unlike their
// sibling DTOs above) — same generated schema, reached via Schemas directly.
type RoutingEntryRequest = Schemas['RoutingEntryRequest'];
type TestModelRequest = Schemas['TestModelRequest'];

/** The server's marker for a user-typed model row (`optionId = "custom"`). */
export const CUSTOM_OPTION_ID = 'custom';

/** What the add-model row collects: a provider, a typed model id and the optional call knobs. */
export type CustomModelInput = TestModelRequest;

type GroupType = 'chat' | 'default';

interface DraftState {
  editing: boolean;
  draft: RoutingEntryRequest[];
  /** Why the last "Test & add" was refused, shown under the add row. */
  addError: string | null;
}

const INITIAL_DRAFTS: Record<GroupType, DraftState> = {
  chat: { editing: false, draft: [], addError: null },
  default: { editing: false, draft: [], addError: null },
};

export function isCustomEntry(entry: Pick<RoutingEntryRequest, 'optionId'>): boolean {
  return entry.optionId === CUSTOM_OPTION_ID;
}

/**
 * Stable identity of a draft row: a menu option is its id; a custom row is provider + model,
 * case-insensitively, which is also what the server treats as a duplicate.
 */
export function draftEntryKey(entry: RoutingEntryRequest): string {
  return isCustomEntry(entry)
    ? `${CUSTOM_OPTION_ID}:${(entry.provider ?? '').toLowerCase()}:${(entry.model ?? '').toLowerCase()}`
    : entry.optionId;
}

function toDraftEntry(entry: LlmRoutingGroupDto['entries'][number]): RoutingEntryRequest {
  if (!entry.custom) return { optionId: entry.optionId };
  return {
    optionId: CUSTOM_OPTION_ID,
    provider: entry.provider,
    model: entry.model ?? '',
    structuredOutput: entry.structuredOutput ?? null,
    reasoningEffort: entry.reasoningEffort ?? null,
    maxOutputTokens: entry.maxOutputTokens ?? null,
    providerPin: entry.providerPin ?? null,
  };
}

/**
 * Draft/save/reset state for the two routing groups (chat, default). Kept as
 * one keyed-by-group state object internally, then flattened back into the
 * `chatX`/`defaultX` fields `LlmKeysManager.tsx` and `RoutingGroupCard`
 * already consume, so neither needed to change shape.
 *
 * A draft holds menu options (reorder only) and custom rows (a typed model the
 * server has just probed with the user's own key; add anywhere, remove freely).
 */
export function useLlmRoutingEditor() {
  const qc = useQueryClient();
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<GroupType, DraftState>>(INITIAL_DRAFTS);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ group: GroupType; op: 'save' | 'reset' | 'test' } | null>(null);

  const applyGroupUpdate = (groupType: GroupType, groupDto: LlmRoutingGroupDto) => {
    qc.setQueryData(keys.settings.llmRouting(), (current: LlmRoutingDto | null | undefined) =>
      current ? { ...current, [groupType]: groupDto } : current
    );
    // A routing change can flip which options are "available" elsewhere too.
    qc.invalidateQueries({ queryKey: keys.settings.all });
    router.refresh();
  };

  const saveMutation = useMutation({
    mutationFn: ({ group, entries }: { group: GroupType; entries: RoutingEntryRequest[] }) =>
      unwrapAction(saveLlmRouting(group, entries)),
  });

  const resetMutation = useMutation({
    mutationFn: (group: GroupType) => unwrapAction(resetLlmRouting(group)),
  });

  const testModelMutation = useMutation({
    mutationFn: (body: TestModelRequest) => unwrapAction(testLlmModel(body)),
  });

  const patchGroup = (groupType: GroupType, patch: Partial<DraftState>) => {
    setDrafts((prev) => ({ ...prev, [groupType]: { ...prev[groupType], ...patch } }));
  };

  const setEditing = (groupType: GroupType, editing: boolean) => {
    patchGroup(groupType, editing ? { editing } : { editing, addError: null });
  };

  const startCustomizingGroup = (groupType: GroupType, groupDto: LlmRoutingGroupDto) => {
    patchGroup(groupType, { editing: true, draft: groupDto.entries.map(toDraftEntry), addError: null });
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

  /** Only custom rows can leave a draft: the menu must stay complete for the save to be accepted. */
  const handleRemoveDraftItem = (groupType: GroupType, index: number) => {
    setDrafts((prev) => {
      const list = prev[groupType].draft;
      if (!list[index] || !isCustomEntry(list[index])) return prev;
      return {
        ...prev,
        [groupType]: { ...prev[groupType], draft: list.filter((_, i) => i !== index) },
      };
    });
  };

  /**
   * Probes the typed model with the user's own key (the server applies the knobs) and appends it
   * to the draft only when the provider answered. Resolves true when the row was added.
   */
  const handleAddCustomModel = async (groupType: GroupType, input: CustomModelInput): Promise<boolean> => {
    const model = input.model.trim();
    if (!input.provider || !model) return false;
    const candidate: RoutingEntryRequest = {
      optionId: CUSTOM_OPTION_ID,
      provider: input.provider,
      model,
      structuredOutput: input.structuredOutput || null,
      reasoningEffort: input.reasoningEffort || null,
      maxOutputTokens: input.maxOutputTokens ?? null,
      providerPin: input.providerPin?.trim() || null,
    };
    if (drafts[groupType].draft.some((d) => draftEntryKey(d) === draftEntryKey(candidate))) {
      patchGroup(groupType, { addError: 'That model is already in this list.' });
      return false;
    }
    patchGroup(groupType, { addError: null });
    setPending({ group: groupType, op: 'test' });
    try {
      const res = await testModelMutation.mutateAsync({
        provider: candidate.provider!,
        model,
        structuredOutput: candidate.structuredOutput,
        reasoningEffort: candidate.reasoningEffort,
        maxOutputTokens: candidate.maxOutputTokens,
        providerPin: candidate.providerPin,
      });
      if (!res.ok) {
        patchGroup(groupType, { addError: res.error ?? 'The model did not respond.' });
        return false;
      }
      setDrafts((prev) => ({
        ...prev,
        [groupType]: { ...prev[groupType], draft: [...prev[groupType].draft, candidate], addError: null },
      }));
      return true;
    } catch (err) {
      patchGroup(groupType, { addError: getErrorMessage(err, "Couldn't test the model. Try again.") });
      return false;
    } finally {
      setPending(null);
    }
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
      setRoutingError(getErrorMessage(err, "Couldn't save routing. Try again."));
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
      setRoutingError(getErrorMessage(err, "Couldn't reset routing. Try again."));
    } finally {
      setPending(null);
    }
  };

  return {
    routingError,
    chatEditing: drafts.chat.editing,
    chatDraft: drafts.chat.draft,
    chatAddError: drafts.chat.addError,
    savingChat: pending?.group === 'chat' && pending.op === 'save',
    resettingChat: pending?.group === 'chat' && pending.op === 'reset',
    testingChat: pending?.group === 'chat' && pending.op === 'test',
    setChatEditing: (editing: boolean) => setEditing('chat', editing),
    defaultEditing: drafts.default.editing,
    defaultDraft: drafts.default.draft,
    defaultAddError: drafts.default.addError,
    savingDefault: pending?.group === 'default' && pending.op === 'save',
    resettingDefault: pending?.group === 'default' && pending.op === 'reset',
    testingDefault: pending?.group === 'default' && pending.op === 'test',
    setDefaultEditing: (editing: boolean) => setEditing('default', editing),
    startCustomizingGroup,
    handleSaveRouting,
    handleResetRouting,
    handleMoveDraftItem,
    handleRemoveDraftItem,
    handleAddCustomModel,
  };
}
