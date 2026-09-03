'use client';

import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Sliders,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Schemas } from '@/lib/api/types';

// The spec marks a few RoutingEntryDto/RoutingOptionDto fields (`model`,
// `notes`) optional+nullable, where the hand-written llmKey.types.ts versions
// only mark them optional — see "Spec follow-ups" in the migration report.
// Using the generated types directly here avoids casting that gap away.
type LlmRoutingGroupDto = Schemas['LlmRoutingGroupDto'];
type RoutingOptionDto = Schemas['RoutingOptionDto'];
type LlmBucketHealthDto = Schemas['LlmBucketHealthDto'];
type RoutingEntryRequest = Schemas['RoutingEntryRequest'];

interface RoutingGroupCardProps {
  groupType: 'chat' | 'default';
  groupDto: LlmRoutingGroupDto;
  editing: boolean;
  draft: RoutingEntryRequest[];
  saving: boolean;
  resetting: boolean;
  health: LlmBucketHealthDto[];
  routingOptions: RoutingOptionDto[];
  onStartCustomizing: () => void;
  onCancelEditing: () => void;
  onSaveRouting: () => void;
  onResetRouting: () => void;
  onMoveDraftItem: (index: number, delta: number) => void;
}

export function RoutingGroupCard({
  groupDto,
  editing,
  draft,
  saving,
  resetting,
  health,
  routingOptions,
  onStartCustomizing,
  onCancelEditing,
  onSaveRouting,
  onResetRouting,
  onMoveDraftItem,
}: RoutingGroupCardProps) {
  return (
    <Card className="border border-slate-200 dark:border-slate-800">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold">
              {groupDto.displayName}
            </CardTitle>
            {groupDto.usingDefaults ? (
              <Badge variant="secondary" className="text-2xs font-normal">
                Default
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-2xs font-normal border-blue-300 text-blue-700 dark:text-blue-400"
              >
                Custom
              </Badge>
            )}
          </div>
          <CardDescription className="text-2xs mt-0.5">
            {groupDto.description}
          </CardDescription>
        </div>

        {!editing ? (
          <div className="flex items-center gap-1">
            {!groupDto.usingDefaults && (
              <Button
                variant="ghost"
                size="xs"
                disabled={resetting}
                onClick={onResetRouting}
                title="Reset to default"
              >
                {resetting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RotateCcw className="h-3 w-3 mr-1" />
                )}
                Reset
              </Button>
            )}
            <Button variant="ghost" size="xs" onClick={onStartCustomizing}>
              <Sliders className="h-3 w-3 mr-1" />
              {groupDto.usingDefaults ? 'Customise' : 'Edit'}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="xs"
              disabled={saving}
              onClick={onCancelEditing}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="xs"
              disabled={saving || draft.length === 0}
              onClick={onSaveRouting}
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <CheckCircle2 className="h-3 w-3 mr-1" />
              )}
              Save
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="px-4 py-2 border-t border-slate-100 dark:border-slate-800">
        {!editing ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {groupDto.entries.map((entry) => {
              const cooled = health.find(
                (h) =>
                  h.provider.toLowerCase() === entry.provider.toLowerCase() &&
                  (h.model === entry.model || !entry.model) &&
                  h.inCooldown
              );

              return (
                <div
                  key={entry.position}
                  className="flex items-center justify-between py-2 text-xs"
                >
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-2xs text-slate-400 pt-0.5">
                      #{entry.position}
                    </span>
                    <div className="flex flex-col">
                      <span
                        className={`font-medium ${
                          entry.hasKey
                            ? 'text-slate-900 dark:text-white'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {entry.optionLabel}
                      </span>
                      {!entry.hasKey && (
                        <span className="text-2xs text-slate-400 dark:text-slate-500">
                          Not configured
                        </span>
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
        ) : (
          <div className="space-y-1.5 py-1">
            {draft.map((item, idx) => {
              const option = routingOptions.find((o) => o.id === item.optionId);
              const hasKey = option?.available ?? false;

              return (
                <div
                  key={item.optionId}
                  className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-md border border-slate-200 dark:border-slate-800"
                >
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost"
                      size="xs"
                      disabled={idx === 0}
                      onClick={() => onMoveDraftItem(idx, -1)}
                      className="h-5 w-5 p-0"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      disabled={idx === draft.length - 1}
                      onClick={() => onMoveDraftItem(idx, 1)}
                      className="h-5 w-5 p-0"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>

                  <span className="font-mono text-2xs text-slate-400">
                    #{idx + 1}
                  </span>

                  <div className="flex flex-col flex-1 min-w-0">
                    <span
                      className={`text-xs font-medium truncate ${
                        hasKey
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {option?.label || item.optionId}
                    </span>
                    {!hasKey && (
                      <span className="text-2xs text-slate-400 dark:text-slate-500">
                        Not configured
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
