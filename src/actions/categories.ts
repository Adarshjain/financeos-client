'use server';

import { revalidatePath } from 'next/cache';

import { ApiError, categoriesApi } from '@/lib/apiClient';
import { Category, CategoryRequest } from '@/lib/categories.types';
import type { ApiResult, ErrorResponse } from '@/lib/types';

function handleCategoryError(error: unknown, defaultMessage: string): { success: false; error: ErrorResponse } {
  if (error instanceof ApiError) {
    return { success: false, error: error.response };
  }
  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: defaultMessage,
      timestamp: new Date().toISOString(),
    },
  };
}

export async function createCategory(
  name: string,
): Promise<ApiResult<Category>> {
  if (!name || name.trim().length === 0) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Category name is required',
        timestamp: new Date().toISOString(),
      },
    };
  }

  try {
    const categoryRequest: CategoryRequest = { name: name.trim() };
    const category = await categoriesApi.create(categoryRequest);
    revalidatePath('/transactions');
    return { success: true, data: category };
  } catch (error) {
    return handleCategoryError(error, 'Failed to create category');
  }
}


export async function categorizeDescription(
  description: string,
): Promise<ApiResult<Category[]>> {
  if (!description || description.trim().length === 0) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'description is empty',
        timestamp: new Date().toISOString(),
      },
    };
  }

  try {
    const category = await categoriesApi.categorizeDescription(description);
    return { success: true, data: category };
  } catch (error) {
    return handleCategoryError(error, 'Failed to categorize');
  }
}


