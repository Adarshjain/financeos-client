'use client';

import { AlertTriangle, Copy, ExternalLink, RotateCcw } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useDiagnostics } from '@/lib/diagnostics/DiagnosticsProvider';
import { navigateTo } from '@/lib/diagnostics/navigate';

interface ErrorStateProps {
  /** The error handed to a route error boundary. */
  error: Error & { digest?: string };
  /** Re-runs the failed render. Provided by Next's error boundary contract. */
  reset: () => void;
  title?: string;
}

/**
 * Shared body for the route error boundaries.
 *
 * Note on `error.message`: for errors thrown during a Server Component render,
 * Next strips the message in production builds and replaces it with a generic
 * string plus a `digest` that correlates to the server log. So the message is
 * only genuinely informative in development — the digest is what's actionable in
 * production, which is why both are rendered when present.
 */
export function ErrorState({ error, reset, title = 'Something went wrong' }: ErrorStateProps) {
  const { pageRequestId } = useDiagnostics();
  const [copied, setCopied] = useState(false);

  const ref = pageRequestId ?? error.digest;

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    if (ref && navigator?.clipboard) {
      navigator.clipboard.writeText(ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDebug = (e: React.MouseEvent) => {
    e.preventDefault();
    if (ref) {
      navigateTo('/debug?ref=' + encodeURIComponent(ref));
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>

        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">
            This view failed to load. Retrying often clears a transient network or
            backend error.
          </p>
        </div>

        {error.message && (
          <p className="break-words rounded-md bg-muted px-3 py-2 text-left font-mono text-xs text-muted-foreground">
            {error.message}
          </p>
        )}

        {ref && (
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              Ref: <span className="font-mono text-foreground font-semibold">{ref}</span>
            </p>
            {error.digest && pageRequestId && error.digest !== pageRequestId && (
              <p className="text-2xs text-muted-foreground">
                Digest: <span className="font-mono">{error.digest}</span>
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {ref && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="flex-1">
                <Copy className="h-4 w-4 mr-1.5" />
                {copied ? 'Copied' : 'Copy ID'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleDebug} className="flex-1">
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Debug
              </Button>
            </>
          )}
          <Button type="button" size="sm" onClick={reset} className="flex-1">
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
