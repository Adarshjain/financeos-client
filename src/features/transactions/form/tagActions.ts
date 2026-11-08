'use server';

import { tagsApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import { action } from '@/lib/observability/action';
import type { Tag } from '@/lib/tags.types';

export const createTag = action('form.tag.createTag', createDomainAction(
  { fallbackError: "Couldn't add the tag. Try again." },
  async (name: string): Promise<Tag> => tagsApi.create({ name }),
));
