'use server';

import { serverApi } from '@/lib/api/server';
import type { Category } from '@/lib/categories.types';
import { createDomainAction } from '@/lib/domainApi';

export const loadCategories = createDomainAction(
  { fallbackError: "Couldn't load categories. Try again." },
  async (): Promise<Category[]> => {
    const { data } = await serverApi.GET('/api/v1/categories');
    return (data ?? []) as unknown as Category[];
  },
);
