'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';

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
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-2 text-center">
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

        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Reference: <span className="font-mono">{error.digest}</span>
          </p>
        )}

        <Button onClick={reset} className="w-full">
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}
