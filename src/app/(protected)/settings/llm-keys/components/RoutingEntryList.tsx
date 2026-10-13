'use client';

import { Badge } from '@/components/ui/badge';
import type { Schemas } from '@/lib/api/types';

type LlmRoutingGroupDto = Schemas['LlmRoutingGroupDto'];
type LlmBucketHealthDto = Schemas['LlmBucketHealthDto'];

interface RoutingEntryListProps {
  entries: LlmRoutingGroupDto['entries'];
  health: LlmBucketHealthDto[];
}

/** Read-only view of a group's order: one row per option or typed model, with key and cooldown state. */
export function RoutingEntryList({ entries, health }: RoutingEntryListProps) {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {entries.map((entry) => {
        const cooled = health.find(
          (h) =>
            h.provider.toLowerCase() === entry.provider.toLowerCase() &&
            (h.model === entry.model || !entry.model) &&
            h.inCooldown
        );

        return (
          <div key={entry.position} className="flex items-center justify-between py-2 text-xs">
            <div className="flex items-start gap-2">
              <span className="font-mono text-2xs text-slate-400 pt-0.5">#{entry.position}</span>
              <div className="flex flex-col">
                <span
                  className={`font-medium ${
                    entry.hasKey ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
                  } ${entry.custom ? 'font-mono' : ''}`}
                >
                  {entry.optionLabel}
                </span>
                {entry.custom && (
                  <span className="text-2xs text-slate-500 dark:text-slate-400">{entry.providerName}</span>
                )}
                {!entry.hasKey && (
                  <span className="text-2xs text-slate-400 dark:text-slate-500">Not configured</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {cooled && cooled.cooldownUntil && (
                <Badge
                  variant="outline"
                  className="text-2xs border-amber-300 text-amber-700 dark:text-amber-400"
                >
                  Cooldown until{' '}
                  {new Date(cooled.cooldownUntil).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Badge>
              )}
              {entry.hasKey && (
                <Badge
                  variant="outline"
                  className="text-2xs border-emerald-300 text-emerald-700 dark:text-emerald-400"
                >
                  Ready
                </Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
