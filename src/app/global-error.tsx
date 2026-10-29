'use client';

import { useEffect } from 'react';

import { getFaro } from '@/instrumentation-client';
import { copyText } from '@/lib/copyText';

// global-error replaces the root layout entirely, so it must render its own
// <html>/<body> and cannot rely on anything the root layout sets up (fonts,
// ThemeProvider, Toaster). It must not import either root's stylesheet: Next
// attaches global-error's CSS to every route, which would ship the Legacy CSS
// to Dinero pages. So it carries a tiny inline stylesheet (light palette, the
// Legacy tokens' values).
const css = `
body{margin:0;background:hsl(210 40% 98%);color:hsl(222 47% 11%);font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;-webkit-font-smoothing:antialiased}
.ge-wrap{display:flex;min-height:100vh;align-items:center;justify-content:center;padding:1rem;box-sizing:border-box}
.ge-box{width:100%;max-width:28rem;text-align:center}
.ge-box>*+*{margin-top:.5rem}
.ge-title{margin:0;font-size:1.125rem;line-height:1.75rem;font-weight:600;letter-spacing:-.025em}
.ge-muted{margin:0;font-size:.875rem;line-height:1.25rem;color:hsl(215 16% 47%)}
.ge-ref{font-size:.75rem;line-height:1rem;cursor:pointer}
.ge-ref:hover{text-decoration:underline}
.ge-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}
.ge-btn{height:2.25rem;width:100%;border:0;border-radius:.375rem;background:hsl(160 84% 39%);padding:0 1rem;font:inherit;font-size:.875rem;font-weight:500;color:#fff;cursor:pointer}
.ge-btn:hover{background:hsl(160 84% 39% / .9)}
`;

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
      <head>
        <style>{css}</style>
      </head>
      <body>
        <div className="ge-wrap">
          <div className="ge-box">
            <h1 className="ge-title">FinanceOS failed to start</h1>
            <p className="ge-muted">
              A problem occurred outside the application shell. Reloading usually
              recovers it.
            </p>

            {error.digest && (
              <p
                className="ge-muted ge-ref"
                onClick={() => {
                  if (error.digest) void copyText(error.digest);
                }}
                title="Click to copy"
              >
                Reference: <span className="ge-mono">{error.digest}</span>
              </p>
            )}

            <button
              onClick={reset}
              className="ge-btn"
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
