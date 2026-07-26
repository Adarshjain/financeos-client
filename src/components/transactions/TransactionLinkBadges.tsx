import { CornerDownRight, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { getDerivedRoleLabel, LINK_TYPES } from '@/lib/transaction.helpers';
import type { TransactionLinkSummary } from '@/lib/transaction.types';
import { cn } from '@/lib/utils';

/**
 * Labels that identify the anchor ("parent") side of a link.
 *
 * Derived from `getDerivedRoleLabel` rather than spelled out again, so a
 * reworded label can't leave this check silently matching nothing. Matching on
 * the label — not the link type — is intentional: `roleLabel` arrives from the
 * server and only the derived wording implies an anchor.
 */
const PARENT_ROLE_LABELS = new Set(LINK_TYPES.map((type) => getDerivedRoleLabel(type, true)));

interface TransactionLinkBadgesProps {
  links?: TransactionLinkSummary[];
}

export function TransactionLinkBadges({ links }: TransactionLinkBadgesProps) {
  if (!links?.length) return null;

  return (
    <>
      {links.map((link) => {
        const label = link.roleLabel || getDerivedRoleLabel(link.type, false);
        const isParentRole = PARENT_ROLE_LABELS.has(label);

        return (
          <Badge
            key={link.linkId}
            variant="secondary"
            className={cn(
              'text-[9px] py-0 px-2 font-bold tracking-tight rounded-md inline-flex items-center gap-1 border',
              isParentRole
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                : 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-900/60',
            )}
          >
            {isParentRole ? (
              <ShieldCheck className="h-2.5 w-2.5 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <CornerDownRight className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
            )}
            <span>{isParentRole ? `Parent • ${label}` : label}</span>
            {link.memberCount > 2 && <span className="opacity-70">({link.memberCount})</span>}
          </Badge>
        );
      })}
    </>
  );
}
