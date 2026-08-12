'use server';

import { categoriesApi } from '@/lib/apiClient';
import { validationError } from '@/lib/apiResult';
import type { Category, CategoryRequest } from '@/lib/categories.types';
import { createDomainAction } from '@/lib/domainApi';
import type { ApiResult } from '@/lib/types';

export async function createCategory(name: string): Promise<ApiResult<Category>> {
  if (!name || name.trim().length === 0) {
    return validationError('Category name is required');
  }
  const action = createDomainAction(
    { fallbackError: 'Failed to create category', revalidatePaths: ['/transactions'] },
    (req: CategoryRequest) => categoriesApi.create(req)
  );
  return action({ name: name.trim() });
}

export const categorizeDescription = createDomainAction(
  { fallbackError: 'Failed to categorize description' },
  (description: string) => categoriesApi.categorizeDescription(description)
);
