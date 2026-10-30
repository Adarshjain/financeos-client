'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { showToast } from '@/components/ds/Toast/Toast';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { keys } from '@/lib/query/keys';

import { createCategory, deleteCategory, renameCategory } from './categoryActions';

/** Create, rename and delete a category. The list is server-rendered, so each success refreshes the page. */
export function useCategoryMutations(handlers: { onCreated?: () => void; onRenamed?: () => void; onDeleted?: () => void } = {}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const done = () => {
    void queryClient.invalidateQueries({ queryKey: keys.categories.all });
    router.refresh();
  };
  const failed = (fallback: string) => (e: unknown) => showToast(getErrorMessage(e, fallback), { tone: 'danger' });

  const create = useMutation({
    mutationFn: (name: string) => unwrapAction(createCategory(name)),
    onSuccess: (category) => {
      showToast(`Category "${category.name}" created`);
      handlers.onCreated?.();
      done();
    },
    onError: failed("Couldn't add the category. Try again."),
  });

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => unwrapAction(renameCategory(id, name)),
    onSuccess: (category) => {
      showToast(`Category renamed to "${category.name}"`);
      handlers.onRenamed?.();
      done();
    },
    onError: failed("Couldn't rename the category. Try again."),
  });

  const remove = useMutation({
    mutationFn: (category: { id: string; name: string }) => unwrapAction(deleteCategory(category.id)),
    onSuccess: (_data, category) => {
      showToast(`Category "${category.name}" deleted`);
      handlers.onDeleted?.();
      done();
    },
    onError: failed("Couldn't delete the category. Try again."),
  });

  return { create, rename, remove };
}
