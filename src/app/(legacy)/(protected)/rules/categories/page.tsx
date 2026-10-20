import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { CategoryManager } from '@/components/rules/CategoryManager';
import { categoriesApi } from '@/lib/apiClient';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';

export default async function CategoriesPage() {
  const qc = getQueryClient();
  await qc.prefetchQuery({ queryKey: keys.categories.list(), queryFn: () => categoriesApi.list() });

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <CategoryManager />
    </HydrationBoundary>
  );
}
