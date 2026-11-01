import { categoryListApi } from '@/lib/apiClient';
import type { CategoryDef } from '@/lib/categoryList.types';

/** The list is static while the app runs: the server keeps it after the first successful fetch. */
let cached: CategoryDef[] | null = null;

export async function fetchCategoryList(): Promise<CategoryDef[]> {
  if (!cached) cached = await categoryListApi.list();
  return cached;
}
