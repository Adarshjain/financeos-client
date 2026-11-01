'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { showToast } from '@/components/ds/Toast/Toast';
import { ActionError, unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { keys } from '@/lib/query/keys';
import type { Tag } from '@/lib/tags.types';

import { createTag } from '../form/tagActions';
import { deleteTag, renameTag } from './tagActions';

/** A second tag with the same name is a conflict the server answers with code CONFLICT. */
export const isTagNameTaken = (error: unknown) => error instanceof ActionError && error.response.code === 'CONFLICT';

/**
 * Create, rename and delete the user's tags. Each refreshes the tags and, for a rename or delete, the
 * transactions that carry them (their rows show the tag names). `onCreated` gets the new tag.
 */
export function useTagMutations(handlers: { onCreated?: (tag: Tag) => void; onDeleted?: (tag: Tag) => void } = {}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const refreshTags = () => void queryClient.invalidateQueries({ queryKey: keys.tags.all });
  const refreshRows = () => {
    void queryClient.invalidateQueries({ queryKey: keys.transactions.all });
    router.refresh();
  };
  const failed = (fallback: string) => (e: unknown) =>
    showToast(isTagNameTaken(e) ? 'A tag with this name already exists.' : getErrorMessage(e, fallback), { tone: 'danger' });

  const create = useMutation({
    mutationFn: (name: string) => unwrapAction(createTag(name)),
    onSuccess: (tag) => {
      refreshTags();
      router.refresh();
      handlers.onCreated?.(tag);
    },
    onError: failed("Couldn't add the tag. Try again."),
  });

  const rename = useMutation({
    mutationFn: ({ tag, name }: { tag: Tag; name: string }) => unwrapAction(renameTag(tag.id, name)),
    onSuccess: () => {
      showToast('Tag renamed');
      refreshTags();
      refreshRows();
    },
    onError: failed("Couldn't rename the tag. Try again."),
  });

  const remove = useMutation({
    mutationFn: (tag: Tag) => unwrapAction(deleteTag(tag.id)),
    onSuccess: (_data, tag) => {
      showToast('Tag deleted');
      refreshTags();
      refreshRows();
      handlers.onDeleted?.(tag);
    },
    onError: failed("Couldn't delete the tag. Try again."),
  });

  return { create, rename, remove };
}
