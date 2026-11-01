'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { unwrapAction } from '@/lib/actionResult';
import { notify } from '@/lib/notify';
import { keys } from '@/lib/query/keys';
import type { Tag } from '@/lib/tags.types';
import { toastError } from '@/lib/toastError';

import { createTag as createTagAction } from './tagActions';

interface UseTagSelectionProps {
  tags: Tag[];
  initialSelectedTags: Tag[];
}

/** The tags picked on the form, and create-a-tag-by-typing. (The tag sheet replaces this plain multi-select next.) */
export function useTagSelection({ tags, initialSelectedTags }: UseTagSelectionProps) {
  const queryClient = useQueryClient();
  const [selectedTags, setSelectedTags] = useState<Tag[]>(initialSelectedTags);
  const [localTags, setLocalTags] = useState<Tag[]>(tags ?? []);

  useEffect(() => {
    setLocalTags(tags);
  }, [tags]);

  const createMutation = useMutation({
    mutationFn: (name: string) => unwrapAction(createTagAction(name)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tags.all });
    },
  });

  const createTag = async (name: string) => {
    try {
      const trimmed = name.trim();
      if (!trimmed) {
        notify.error("Couldn't add the tag. Enter a tag name.");
        return;
      }
      const created = await createMutation.mutateAsync(trimmed);
      setLocalTags((prev) => [...prev, created]);
      setSelectedTags((prev) => [...prev, created]);
    } catch (err) {
      toastError(err, "Couldn't add the tag. Try again.");
    }
  };

  return { localTags, selectedTags, setSelectedTags, creatingTag: createMutation.isPending, createTag };
}
