'use client';

import { ChevronDown, ChevronRight, Copy, ListOrdered, Loader2, Terminal } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api/client';
import type { DiagnosticsLookupResponse } from '@/lib/api/types';

interface TimelineListProps {
  timeline: DiagnosticsLookupResponse['timeline'];
  truncated?: boolean;
  currentRef?: string;
  currentType?: string;
}

export function TimelineList({
  timeline,
  truncated = false,
  currentRef,
  currentType = 'auto',
}: TimelineListProps) {
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [copyingRaw, setCopyingRaw] = useState(false);

  const toggleRow = (idx: number) => {
    setExpandedRows((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleCopyRaw = async () => {
    if (!currentRef) return;
    setCopyingRaw(true);
    try {
      const { data, error } = await api.GET('/api/v1/diagnostics/lookup/raw', {
        params: {
          query: {
            ref: currentRef,
            type: currentType || 'auto',
          },
        },
      });
      if (error) {
        throw error;
      }
      const rawText = JSON.stringify(data ?? [], null, 2);
      if (navigator?.clipboard) {
        await navigator.clipboard.writeText(rawText);
        toast.success('Raw log entries copied to clipboard');
      }
    } catch {
      toast.error('Failed to fetch raw log lines');
    } finally {
      setCopyingRaw(false);
    }
  };

  const getLevelBadge = (level: string) => {
    const l = level.toUpperCase();
    if (l === 'ERROR') {
      return <span className="px-1.5 py-0.5 rounded text-2xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">ERROR</span>;
    }
    if (l === 'WARN') {
      return <span className="px-1.5 py-0.5 rounded text-2xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">WARN</span>;
    }
    return <span className="px-1.5 py-0.5 rounded text-2xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">INFO</span>;
  };

  const getSourceBadge = (source: string) => {
    const s = source.toLowerCase();
    if (s === 'server') {
      return <Badge variant="outline" className="text-2xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">Server</Badge>;
    }
    if (s === 'client') {
      return <Badge variant="outline" className="text-2xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">Client</Badge>;
    }
    return <Badge variant="outline" className="text-2xs uppercase tracking-wider text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800">Faro</Badge>;
  };

  return (
    <Card className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-slate-500" />
            Event Timeline ({timeline.length})
          </CardTitle>
          {truncated && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              (Truncated to first 500 lines)
            </span>
          )}
        </div>

        {currentRef && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyRaw}
            disabled={copyingRaw}
            className="h-8 text-xs shrink-0"
          >
            {copyingRaw ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Copy className="w-3.5 h-3.5 mr-1" />
            )}
            Copy raw
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
        {timeline.map((entry, idx) => {
          const isExpanded = Boolean(expandedRows[idx]);
          const hasDetails = (entry.fields && Object.keys(entry.fields).length > 0) || Boolean(entry.stackTrace);

          return (
            <div key={idx} className="p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors">
              <div
                className={`flex items-start gap-2.5 ${hasDetails ? 'cursor-pointer select-none' : ''}`}
                onClick={() => hasDetails && toggleRow(idx)}
              >
                <div className="pt-0.5 text-slate-400">
                  {hasDetails ? (
                    isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                  ) : (
                    <div className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {getSourceBadge(entry.source)}
                    {getLevelBadge(entry.level)}
                    <span className="font-mono text-2xs text-slate-400">
                      {new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}
                    </span>
                    {entry.event && (
                      <span className="font-mono text-2xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        event={entry.event}
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-mono text-slate-800 dark:text-slate-200 break-words leading-relaxed">
                    {entry.message}
                  </p>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 pl-6 space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  {entry.fields && Object.keys(entry.fields).length > 0 && (
                    <div className="space-y-1">
                      <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">Structured Fields</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2 rounded-md bg-slate-50 dark:bg-slate-850 font-mono text-2xs border border-slate-200/50 dark:border-slate-800">
                        {Object.entries(entry.fields).map(([k, v]) => (
                          <div key={k} className="truncate">
                            <span className="text-slate-500">{k}:</span>{' '}
                            <span className="text-slate-800 dark:text-slate-200 font-semibold">
                              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.stackTrace && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-slate-500">
                        <Terminal className="w-3.5 h-3.5" />
                        Stack Trace
                      </div>
                      <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-2xs overflow-x-auto max-h-80 leading-relaxed">
                        {entry.stackTrace}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
