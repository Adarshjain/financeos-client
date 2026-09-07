'use client';

import { Check, Copy, History, Share2, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDiagnostics } from '@/lib/diagnostics/DiagnosticsProvider';
import { type DiagnosticRecord, errorLog } from '@/lib/diagnostics/errorLog';

interface LocalErrorsSectionProps {
  highlightRef?: string;
  onSelectRef?: (ref: string) => void;
}

export function LocalErrorsSection({
  highlightRef,
  onSelectRef,
}: LocalErrorsSectionProps) {
  const records = useSyncExternalStore(
    errorLog.subscribe,
    errorLog.getSnapshot,
    () => [],
  );

  const { pageRequestId, sessionId } = useDiagnostics();
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const highlightedRowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (highlightRef && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightRef, records]);

  const handleCopyRef = (rec: DiagnosticRecord) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(rec.ref);
      setCopiedRef(rec.ref);
      toast.success(`Copied ref ${rec.ref}`);
      setTimeout(() => setCopiedRef(null), 2000);
    }
    if (onSelectRef) {
      onSelectRef(rec.ref);
    }
  };

  const generateReportText = (): string => {
    const lines: string[] = [];
    lines.push('=== FinanceOS Diagnostics Report ===');
    lines.push(`Generated: ${new Date().toISOString()}`);
    if (pageRequestId) lines.push(`Page Request ID: ${pageRequestId}`);
    if (sessionId) lines.push(`Faro Session ID: ${sessionId}`);
    lines.push(`Total Local Records: ${records.length}`);
    lines.push('----------------------------------------');

    for (const r of records) {
      lines.push(`${r.at} | ${r.ref} | HTTP ${r.status} (${r.code}) | ${r.method ?? 'GET'} ${r.endpoint ?? r.route} | ${r.message}`);
    }

    return lines.join('\n');
  };

  const handleCopyAll = () => {
    const text = generateReportText();
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success('Diagnostics report copied to clipboard');
    }
  };

  const handleShare = async () => {
    const text = generateReportText();
    if (typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'FinanceOS Diagnostics Report',
          text,
        });
        return;
      } catch {
        // Fallback to clipboard if user dismissed or share failed
      }
    }
    handleCopyAll();
  };

  const handleClear = () => {
    errorLog.clear();
    toast.info('Local error history cleared');
  };

  return (
    <Card className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-slate-500" />
            Recent Failures on This Device ({records.length})
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            The last 20 failures recorded in your local browser session. Tap any row to copy its reference ID.
          </p>
        </div>

        {records.length > 0 && (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleCopyAll} className="h-8 text-xs">
              <Copy className="w-3.5 h-3.5 mr-1" />
              Copy all
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleShare} className="h-8 text-xs">
              <Share2 className="w-3.5 h-3.5 mr-1" />
              Share
            </Button>
            <Button type="button" variant="ghost-destructive" size="sm" onClick={handleClear} className="h-8 text-xs">
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {records.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No local failures recorded in this browser session.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {records.map((rec, idx) => {
              const isHighlighted = highlightRef && rec.ref === highlightRef;
              const isCopied = copiedRef === rec.ref;

              return (
                <div
                  key={`${rec.at}-${idx}`}
                  ref={isHighlighted ? highlightedRowRef : null}
                  onClick={() => handleCopyRef(rec)}
                  className={`group p-3.5 transition-all cursor-pointer select-none ${
                    isHighlighted
                      ? 'bg-amber-50/70 dark:bg-amber-950/20 border-l-4 border-amber-500'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-850/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        {rec.ref}
                      </span>
                      <Badge variant={rec.status >= 500 ? 'destructive' : 'secondary'} className="font-mono text-2xs">
                        {rec.status > 0 ? `HTTP ${rec.status}` : 'Network'}
                      </Badge>
                      <span className="text-2xs font-semibold text-slate-500 uppercase">
                        {rec.code}
                      </span>
                      {rec.endpoint && (
                        <span className="font-mono text-2xs text-slate-500 truncate max-w-xs">
                          {rec.endpoint}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-2xs text-slate-400 font-mono">
                      <span>{new Date(rec.at).toLocaleTimeString()}</span>
                      {isCopied ? (
                        <span className="text-emerald-500 flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Copied
                        </span>
                      ) : (
                        <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </div>

                  <p className="mt-1 text-xs text-slate-700 dark:text-slate-300 break-words">
                    {rec.message}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
