'use client';

import { Bug, Info, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

import { LocalErrorsSection } from './LocalErrorsSection';
import { RefLookupForm } from './RefLookupForm';
import { RequestCard } from './RequestCard';
import { RootCauseCard } from './RootCauseCard';
import { TimelineList } from './TimelineList';
import { useDiagnosticsLookup } from './useDiagnosticsLookup';

interface DebugPageProps {
  initialRef?: string;
  initialType?: string;
  admin: boolean;
}

export function DebugPage({
  initialRef = '',
  initialType = 'auto',
  admin,
}: DebugPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [currentRef, setCurrentRef] = useState(initialRef);
  const [currentType, setCurrentType] = useState(initialType);

  const { data, isLoading, isError, error } = useDiagnosticsLookup(
    currentRef,
    currentType,
    admin,
  );

  const handleSearch = useCallback(
    (newRef: string, newType: string = 'auto') => {
      setCurrentRef(newRef);
      setCurrentType(newType);

      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (newRef) {
        params.set('ref', newRef);
      } else {
        params.delete('ref');
      }

      if (newType && newType !== 'auto') {
        params.set('type', newType);
      } else {
        params.delete('type');
      }

      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(newUrl);
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Bug className="w-7 h-7 text-indigo-500" />
            Diagnostics & Debug
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Resolve request IDs and error IDs to a root cause and the correlated log timeline.
          </p>
        </div>

        <div>
          {admin ? (
            <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 px-3 py-1 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin Mode
            </Badge>
          ) : (
            <Badge variant="outline" className="text-slate-500 border-slate-300 dark:border-slate-700 flex items-center gap-1.5 px-3 py-1 text-xs">
              <Info className="w-3.5 h-3.5" />
              Client Ring Buffer
            </Badge>
          )}
        </div>
      </div>

      {/* Admin Section vs Non-Admin Notice */}
      {admin ? (
        <div className="space-y-6">
          <Card className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                LogQL Reference Lookup
              </h2>
              <RefLookupForm
                initialRef={currentRef}
                initialType={currentType}
                onSearch={handleSearch}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm font-medium">Querying Loki logs and correlating trace timeline...</p>
            </div>
          )}

          {isError && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                Diagnostics Lookup Failed
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                {error instanceof Error ? error.message : 'Failed to retrieve diagnostic data from Loki.'}
              </p>
            </div>
          )}

          {data && !isLoading && (
            <div className="space-y-6">
              {data.request && <RequestCard request={data.request} />}
              <RootCauseCard rootCause={data.rootCause} />
              <TimelineList
                timeline={data.timeline}
                truncated={data.truncated}
                currentRef={data.ref}
                currentType={currentType}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-white">
            <Info className="w-4 h-4 text-indigo-500" />
            Admin Log Lookup Restricted
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Send this reference to the developer. The list below is stored only in this browser.
          </p>
        </div>
      )}

      {/* Local Ring Buffer (Available for all users) */}
      <LocalErrorsSection
        highlightRef={currentRef}
        onSelectRef={(selectedRef) => {
          if (admin) {
            handleSearch(selectedRef, 'auto');
          } else {
            setCurrentRef(selectedRef);
          }
        }}
      />
    </div>
  );
}
