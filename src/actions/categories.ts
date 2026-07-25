'use server';

import { revalidatePath } from 'next/cache';

import { categoriesApi } from '@/lib/apiClient';
import { apiResult, validationError } from '@/lib/apiResult';
import { CategorizeResponse, Category, CategoryRequest } from '@/lib/categories.types';
import type { ApiResult } from '@/lib/types';

export async function createCategory(
  name: string,
): Promise<ApiResult<Category>> {
  if (!name || name.trim().length === 0) {
    return validationError('Category name is required');
  }

  return apiResult('Failed to create category', async () => {
    const categoryRequest: CategoryRequest = { name: name.trim() };
    const category = await categoriesApi.create(categoryRequest);
    revalidatePath('/transactions');
    return category;
  });
}

export async function categorizeDescription(
  description: string,
): Promise<ApiResult<CategorizeResponse>> {
  return apiResult('Failed to categorize description', () =>
    categoriesApi.categorizeDescription(description),
  );
}
