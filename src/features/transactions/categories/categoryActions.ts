'use server';

import { serverApi } from '@/lib/api/server';
import type { Category } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';

export const createCategory = createDomainAction(
  { fallbackError: "Couldn't add the category. Try again." },
  async (name: string): Promise<Category> => {
    const { data } = await serverApi.POST('/api/v1/categories', { body: { name } });
    return data!;
  },
);

export const renameCategory = createDomainAction(
  { fallbackError: "Couldn't rename the category. Try again." },
  async (id: string, name: string): Promise<Category> => {
    const { data } = await serverApi.PUT('/api/v1/categories/{id}', { params: { path: { id } }, body: { name } });
    return data!;
  },
);

export const deleteCategory = createDomainAction(
  { fallbackError: "Couldn't delete the category. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/categories/{id}', { params: { path: { id } } });
  },
);
