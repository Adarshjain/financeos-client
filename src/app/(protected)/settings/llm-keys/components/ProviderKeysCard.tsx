'use client';

import {
  ArrowDown,
  ArrowUp,
  Loader2,
  MoreVertical,
  Play,
  Plus,
  Sliders,
  Trash2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { LlmKeyDto, TestKeyResponse } from '@/lib/api/types';

export interface ProviderConfig {
  id: string;
  name: string;
  getKeyUrl: string;
}

interface ProviderKeysCardProps {
  provider: ProviderConfig;
  providerKeys: LlmKeyDto[];
  isCustomizing: boolean;
  onToggleCustomizing: () => void;
  onOpenAddModal: (provider: ProviderConfig) => void;
  onOpenDeleteModal: (key: LlmKeyDto) => void;
  onMove: (key: LlmKeyDto, delta: number) => void;
  onTestKey: (key: LlmKeyDto) => void;
  testingKeyId: string | null;
  testResults: { [id: string]: TestKeyResponse };
}

export function ProviderKeysCard({
  provider,
  providerKeys,
  isCustomizing,
  onToggleCustomizing,
  onOpenAddModal,
  onOpenDeleteModal,
  onMove,
  onTestKey,
  testingKeyId,
  testResults,
}: ProviderKeysCardProps) {
  return (
    <Card className="border border-slate-200 dark:border-slate-800">
      <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle className="font-semibold text-slate-900 dark:text-white text-base">
            {provider.name}
          </CardTitle>
        </div>
        <div className="flex items-center gap-1">
          {providerKeys.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCustomizing}
            >
              <Sliders className="h-3.5 w-3.5 mr-1" />
              {isCustomizing ? 'Done' : 'Customise'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenAddModal(provider)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Key
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 py-0">
        {providerKeys.length === 0 ? (
          <div className="text-center py-3">
            <p className="text-slate-500 text-sm">
              No {provider.name} keys configured.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {providerKeys.map((key, idx) => {
              const testResult = testResults[key.id];
              const isTesting = testingKeyId === key.id;

              return (
                <div
                  key={key.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className="font-mono text-xs font-medium"
                    >
                      #{key.position}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1 flex-col">
                        <div className="font-medium text-slate-900 dark:text-white text-sm">
                          {key.label || `${provider.name} Key`}
                        </div>
                        <div className="text-xs font-mono text-slate-400">
                          •••• {key.keyLast4}
                        </div>
                      </div>
                      {key.status === 'ACTIVE' ? (
                        <Badge
                          variant="outline"
                          className="text-xs border-emerald-300 text-emerald-700 dark:text-emerald-400"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs border-rose-300 text-rose-700 dark:text-rose-400"
                        >
                          Invalid
                        </Badge>
                      )}

                      {testResult && (
                        <span
                          className={`text-2xs font-medium px-2 py-0.5 rounded ${
                            testResult.ok
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}
                        >
                          {testResult.ok ? 'Verified' : 'Verification failed'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {isCustomizing && (
                      <div className="flex items-center gap-0.5 mr-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={idx === 0}
                          onClick={() => onMove(key, -1)}
                          title="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={idx === providerKeys.length - 1}
                          onClick={() => onMove(key, 1)}
                          title="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="h-7 w-7 p-0"
                          title="Key options"
                        >
                          <MoreVertical className="h-3.5 w-3.5 text-slate-500" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem
                          disabled={isTesting}
                          onClick={() => onTestKey(key)}
                          className="cursor-pointer"
                        >
                          {isTesting ? (
                            <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                          ) : (
                            <Play className="h-3.5 w-3.5 mr-2 text-slate-500" />
                          )}
                          <span>Test Key</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onOpenDeleteModal(key)}
                          className="text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/20 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          <span>Delete Key</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
