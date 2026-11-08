'use server';

import { tagsApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import { action } from '@/lib/observability/action';
import type { Tag } from '@/lib/tags.types';

export const loadTags = action('query.tag.loadTags', createDomainAction(
  { fallbackError: "Couldn't load tags. Try again." },
  async (): Promise<Tag[]> => tagsApi.list(),
));
