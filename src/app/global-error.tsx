'use client';

import '../../design-system/tokens.css';
import './(ds)/ds.css';

import React, { useEffect } from 'react';

import { Button } from '@/components/ds/Button/Button';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { Root } from '@/components/ds/Root/Root';
import { Text } from '@/components/ds/Text/Text';
import { Illustration } from '@/components/organisms/Illustration/Illustration';
import { getFaro } from '@/instrumentation-client';
import { copyText } from '@/lib/copyText';

import { bricolageGrotesque, figtree } from './dsFonts';

// global-error replaces the root layout entirely, so it renders its own <html>/<body> and loads the Dinero
// stylesheet and fonts itself. No providers: it uses only components that work without them.
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
    <html lang="en" className={`${figtree.variable} ${bricolageGrotesque.variable}`}>
      <body className="antialiased">
        <Root>
          <main className="min-h-dvh flex items-center justify-center p-space-20">
            <EmptyState
              illustration={<Illustration variant="error" />}
              title="FinanceOS failed to start"
              description="A problem occurred outside the application shell. Reloading usually recovers it."
              action={{ label: 'Reload', onSelect: reset }}
            >
              {error.digest && (
                <Text variant="caption" tone="ink-3" as="p">
                  Reference:{' '}
                  <Button
                    variant="link"
                    onClick={() => {
                      if (error.digest) void copyText(error.digest);
                    }}
                    title="Click to copy"
                  >
                    {error.digest}
                  </Button>
                </Text>
              )}
            </EmptyState>
          </main>
        </Root>
      </body>
    </html>
  );
}
