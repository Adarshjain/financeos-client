import { SerwistProvider } from '@serwist/turbopack/react';
import { Suspense } from 'react';

import { AppLockWatcher } from '@/features/app-lock/AppLockWatcher';
import { FaroRouteTracker } from '@/lib/providers/FaroRouteTracker';
import { QueryProvider } from '@/lib/providers/QueryProvider';
import { ThemeProvider } from '@/lib/providers/ThemeProvider';

const isDev = process.env.NODE_ENV === 'development';

/** Non-visual providers of the root layout; the Toaster lives in Dinero Root. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProvider>
        {/* Registering in dev would have the worker serve stale precached
            assets across HMR reloads. */}
        <SerwistProvider swUrl="/serwist/sw.js" disable={isDev} cacheOnNavigation={false}>
          {children}
        </SerwistProvider>
        <Suspense fallback={null}>
          <FaroRouteTracker />
        </Suspense>
        <AppLockWatcher />
      </QueryProvider>
    </ThemeProvider>
  );
}
