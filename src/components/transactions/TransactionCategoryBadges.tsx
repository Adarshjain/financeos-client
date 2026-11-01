import { Badge } from '@/components/ui/badge';
import type { Tag } from '@/lib/tags.types';

interface TransactionCategoryBadgesProps {
  categories?: Tag[];
}

export function TransactionCategoryBadges({ categories }: TransactionCategoryBadgesProps) {
  if (!categories?.length) return null;

  return (
    <div className="flex gap-0.5">
      {categories.map((category) => (
        <Badge
          key={category.id}
          variant="outline"
          className="rounded-full px-2 text-2xs py-0 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
        >
          {category.name}
        </Badge>
      ))}
    </div>
  );
}
