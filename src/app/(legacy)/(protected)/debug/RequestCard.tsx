'use client';

import { Activity, Clock, Globe, User } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DiagnosticsLookupResponse } from '@/lib/api/types';

interface RequestCardProps {
  request: NonNullable<DiagnosticsLookupResponse['request']>;
}

export function RequestCard({ request }: RequestCardProps) {
  const getStatusBadge = (status: number) => {
    if (status >= 500) {
      return <Badge className="bg-rose-500 text-white font-mono">{status}</Badge>;
    }
    if (status >= 400) {
      return <Badge className="bg-amber-500 text-white font-mono">{status}</Badge>;
    }
    if (status >= 300) {
      return <Badge className="bg-blue-500 text-white font-mono">{status}</Badge>;
    }
    return <Badge className="bg-emerald-500 text-white font-mono">{status}</Badge>;
  };

  return (
    <Card className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-500" />
          HTTP Request Summary
        </CardTitle>
        <div className="flex items-center gap-2">
          {request.slow && (
            <Badge variant="outline" className="text-amber-500 border-amber-400">
              Slow
            </Badge>
          )}
          {getStatusBadge(request.status)}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium">Route & Method</span>
            <div className="mt-1 font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
              <span className="text-indigo-600 dark:text-indigo-400">{request.method}</span>
              <span className="truncate" title={request.route}>{request.route}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium">Duration & Timestamp</span>
            <div className="mt-1 flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono font-semibold">{request.durationMs}ms</span>
              <span className="text-slate-400">·</span>
              <span className="truncate">{new Date(request.at).toLocaleTimeString()}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium">User Context</span>
            <div className="mt-1 flex items-center gap-1.5 text-slate-800 dark:text-slate-200 truncate">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate font-medium" title={request.userEmail ?? request.userId ?? 'Anonymous'}>
                {request.userEmail ?? (request.userId ? `User: ${request.userId.slice(0, 8)}…` : 'Anonymous')}
              </span>
            </div>
          </div>

          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium">App Version</span>
            <div className="mt-1 flex items-center gap-1.5 text-slate-800 dark:text-slate-200 truncate">
              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-mono text-2xs truncate" title={request.version ?? 'unknown'}>
                {request.version ?? 'unknown'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
