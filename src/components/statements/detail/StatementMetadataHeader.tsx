'use client';

import { ShieldAlert, ShieldCheck } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { StatementDetail } from '@/lib/statement.types';

interface StatementMetadataHeaderProps {
  selectedDetail: StatementDetail;
}

export function StatementMetadataHeader({
  selectedDetail,
}: StatementMetadataHeaderProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs w-full min-w-0">
      <div className="min-w-0">
        <span className="text-slate-400 dark:text-slate-500 block">
          Checksum Status
        </span>
        <div className="flex items-center gap-1.5 mt-1 min-w-0">
          {selectedDetail.checksumOk ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          )}
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
            {selectedDetail.checksumOk
              ? 'SHA-256 Validated'
              : 'Checksum Warning'}
          </span>
        </div>
      </div>
      <div className="min-w-0">
        <span className="text-slate-400 dark:text-slate-500 block">
          Parse Mode
        </span>
        <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase mt-1 block truncate">
          {selectedDetail.parseMode || 'STANDARD'}
        </span>
      </div>
      <div className="min-w-0">
        <span className="text-slate-400 dark:text-slate-500 block">
          Chain Validation
        </span>
        <div className="mt-1">
          <Badge
            variant={
              selectedDetail.chainValidationPct !== null &&
              selectedDetail.chainValidationPct >= 99
                ? 'success'
                : 'warning'
            }
          >
            {selectedDetail.chainValidationPct !== null
              ? `${selectedDetail.chainValidationPct.toFixed(1)}% Valid`
              : 'N/A'}
          </Badge>
        </div>
      </div>
      <div className="min-w-0">
        <span className="text-slate-400 dark:text-slate-500 block">
          Ingestion Source
        </span>
        <span className="font-semibold text-slate-800 dark:text-slate-200 mt-1 block uppercase truncate">
          {selectedDetail.source}
        </span>
      </div>
    </div>
  );
}
