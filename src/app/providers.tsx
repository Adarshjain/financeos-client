import { SerwistProvider } from '@serwist/turbopack/react';

import { FaroRouteTracker } from '@/components/FaroRouteTracker';
import { QueryProvider } from '@/components/QueryProvider';
import { ThemeProvider } from '@/components/ThemeProvider';

const isDev = process.env.NODE_ENV === 'development';

/** Non-visual providers shared by both root layouts. Toasters stay in each root (Legacy sonner, Dinero Root). */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProvider>
        {/* Registering in dev would have the worker serve stale precached
            assets across HMR reloads. */}
        <SerwistProvider swUrl="/serwist/sw.js" disable={isDev}>
          {children}
        </SerwistProvider>
        <FaroRouteTracker />
      </QueryProvider>
    </ThemeProvider>
  );
}
