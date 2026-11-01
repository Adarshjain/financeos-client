'use server';

import { fetchCategoryList } from '@/lib/categoryList.server';
import { createDomainAction } from '@/lib/domainApi';

export const loadCategoryList = createDomainAction(
  { fallbackError: "Couldn't load the category list. Try again." },
  fetchCategoryList,
);
