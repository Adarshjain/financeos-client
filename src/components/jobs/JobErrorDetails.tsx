'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';

export function JobErrorDetails({
  errorCode,
  errorMessage,
}: {
  errorCode?: string | null;
  errorMessage?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!errorCode && !errorMessage) return null;

  return (
    <div className="mt-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center text-2xs text-rose-600 dark:text-rose-400 hover:underline font-medium focus:outline-none"
      >
        {expanded ? <ChevronDown className="w-3 h-3 mr-0.5" /> : <ChevronRight className="w-3 h-3 mr-0.5" />}
        Error details ({errorCode || 'ERROR'})
      </button>
      {expanded && (
        <div className="mt-1 p-2 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-2xs font-mono text-rose-900 dark:text-rose-200 whitespace-pre-wrap break-all">
          <span className="font-semibold block mb-0.5">{errorCode}:</span>
          {errorMessage}
        </div>
      )}
    </div>
  );
}
