'use server';

import { tagsApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import type { Tag } from '@/lib/tags.types';

export const loadTags = createDomainAction(
  { fallbackError: "Couldn't load tags. Try again." },
  async (): Promise<Tag[]> => tagsApi.list(),
);
