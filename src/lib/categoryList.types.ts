import type { IconName } from '@/components/ds/Icon/registry';
import type { Schemas } from '@/lib/api/types';

export type CategoryDirection = 'OUT' | 'IN' | 'BOTH';
export type CategorySource = 'AUTO' | 'LINK' | 'RULE' | 'USER';

/** `{ key, name, icon }` as it comes on a transaction or a rule. */
export type CategoryRef = Schemas['CategoryRef'];
export type SubcategoryRef = Schemas['SubcategoryRef'];

export interface CategorySub {
  key: string;
  name: string;
  direction: CategoryDirection;
  sortOrder: number;
}

/** One entry of the fixed list (GET /category-list). */
export interface CategoryDef {
  key: string;
  name: string;
  direction: CategoryDirection;
  outOrder: number | null;
  inOrder: number | null;
  icon: IconName;
  excludedByDefault: boolean;
  subs: CategorySub[];
}

/** What the picker saves: a category, and a sub-category or none ("Others"). */
export interface CategoryPick {
  categoryKey: string;
  subcategoryKey: string | null;
}
