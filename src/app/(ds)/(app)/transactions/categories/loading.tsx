import React from 'react';

import { CategoriesSkeleton } from '@/features/transactions/categories/CategoriesSkeleton';

/** Shown while the categories load. */
export default function DsCategoriesLoading() {
  return <CategoriesSkeleton />;
}
