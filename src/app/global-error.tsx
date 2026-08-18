'use client';

import './globals.css';

import { useEffect } from 'react';

import { getFaro } from '@/instrumentation-client';

// global-error replaces the root layout entirely, so it must render its own
// <html>/<body> and cannot rely on anything the root layout sets up (fonts,
// ThemeProvider, Toaster). The stylesheet is imported here directly; the
// semantic tokens it defines on `:root` resolve without ThemeProvider, falling
// back to the light palette.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const faro = getFaro();
    if (faro) {
      faro.api.pushError(error, {
        context: {
          digest: error.digest || '',
          route: 'global-error',
        },
      });
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md space-y-2 text-center">
            <h1 className="text-lg font-semibold">FinanceOS failed to start</h1>
            <p className="text-sm text-muted-foreground">
              A problem occurred outside the application shell. Reloading usually
              recovers it.
            </p>

            {error.digest && (
              <p className="text-xs text-muted-foreground">
                Reference: <span className="font-mono">{error.digest}</span>
              </p>
            )}

            <button
              onClick={reset}
              className="h-9 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
