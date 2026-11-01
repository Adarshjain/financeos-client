'use server';

import { tagsApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import type { Tag } from '@/lib/tags.types';

export const renameTag = createDomainAction(
  { fallbackError: "Couldn't rename the tag. Try again." },
  async (id: string, name: string): Promise<Tag> => tagsApi.rename(id, { name }),
);

export const deleteTag = createDomainAction(
  { fallbackError: "Couldn't delete the tag. Try again." },
  async (id: string): Promise<void> => tagsApi.delete(id),
);

/** Puts the tags on every one of the transactions; ones a transaction already has are left as they are. */
export const bulkAddTags = createDomainAction(
  { fallbackError: "Couldn't add the tags. Try again." },
  async (transactionIds: string[], tagIds: string[]) => tagsApi.bulkAdd({ transactionIds, tagIds }),
);
