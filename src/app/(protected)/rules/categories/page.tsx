import { CategoryManager } from '@/components/rules/CategoryManager';
import { categoriesApi } from '@/lib/apiClient';

export default async function CategoriesPage() {
  const categories = await categoriesApi.list().catch(() => []);

  return <CategoryManager initialCategories={categories} />;
}
