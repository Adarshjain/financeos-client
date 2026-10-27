'use client';

import { ShieldAlert, Sparkles } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DiagnosticsLookupResponse } from '@/lib/api/types';

interface RootCauseCardProps {
  rootCause: DiagnosticsLookupResponse['rootCause'];
}

export function RootCauseCard({ rootCause }: RootCauseCardProps) {
  const getKindBadge = (kind: string) => {
    switch (kind) {
      case 'SERVER_EXCEPTION':
        return <Badge className="bg-rose-500 hover:bg-rose-600 text-white">Server Exception</Badge>;
      case 'UPSTREAM_FAILURE':
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Upstream Failure</Badge>;
      case 'CLIENT_REJECTED':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Client Rejected (4xx)</Badge>;
      case 'UNAUTHENTICATED':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Unauthenticated (401)</Badge>;
      case 'FORBIDDEN':
        return <Badge className="bg-rose-500 hover:bg-rose-600 text-white">Forbidden (403)</Badge>;
      case 'RATE_LIMITED':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Rate Limited (429)</Badge>;
      case 'INCOMPLETE':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Incomplete</Badge>;
      case 'NOT_FOUND_IN_LOGS':
      default:
        return <Badge variant="secondary">Not Found in Logs</Badge>;
    }
  };

  return (
    <Card className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-500" />
          Root Cause Analysis
        </CardTitle>
        {getKindBadge(rootCause.kind)}
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {rootCause.headline}
          </h3>
          {rootCause.detail && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {rootCause.detail}
            </p>
          )}
        </div>

        {(rootCause.exceptionClass || rootCause.oraCode || rootCause.rootFrame) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 text-xs">
            {rootCause.exceptionClass && (
              <div>
                <span className="font-semibold text-slate-500 dark:text-slate-400">Exception:</span>{' '}
                <span className="font-mono text-slate-800 dark:text-slate-200">{rootCause.exceptionClass}</span>
              </div>
            )}
            {rootCause.oraCode && (
              <div>
                <span className="font-semibold text-slate-500 dark:text-slate-400">Oracle Code:</span>{' '}
                <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">{rootCause.oraCode}</span>
              </div>
            )}
            {rootCause.rootFrame && (
              <div className="sm:col-span-2 overflow-x-auto">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Root Frame:</span>{' '}
                <span className="font-mono text-2xs text-slate-800 dark:text-slate-200 break-words">{rootCause.rootFrame}</span>
              </div>
            )}
          </div>
        )}

        {rootCause.hints && rootCause.hints.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Diagnostic Hints & Knowledge Base
            </h4>
            <ul className="space-y-1 pl-5 list-disc text-xs text-slate-700 dark:text-slate-300">
              {rootCause.hints.map((hint, idx) => (
                <li key={idx} className="leading-relaxed">
                  {hint}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
