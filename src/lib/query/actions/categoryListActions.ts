'use server';

import { fetchCategoryList } from '@/lib/categoryList.server';
import { createDomainAction } from '@/lib/domainApi';
import { action } from '@/lib/observability/action';

export const loadCategoryList = action('categoryList.loadCategoryList', createDomainAction(
  { fallbackError: "Couldn't load the category list. Try again." },
  fetchCategoryList,
));
