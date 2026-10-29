'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';

import { isAuthExpiredClaimed } from '@/lib/authExpiry';
import { getQueryClient } from '@/lib/query/client';

// Devtools are a development tool: the dynamic import is dead code (and its chunk is dropped) in production.
const ReactQueryDevtools =
  process.env.NODE_ENV === 'development'
    ? dynamic(() => import('@tanstack/react-query-devtools').then((m) => m.ReactQueryDevtools), { ssr: false })
    : () => null;

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());
  const router = useRouter();
  // Devtools only at lg+ (>=1024px): below that the floating button sits on
  // top of the fixed bottom MobileNav. Starts false on server and client, so
  // no hydration mismatch.
  const [showDevtools, setShowDevtools] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setShowDevtools(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    let redirected = false;
    const handleAuthExpired = () => {
      if (isAuthExpiredClaimed()) return;
      if (!redirected) {
        redirected = true;
        router.push('/login');
      }
    };

    window.addEventListener('financeos:auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('financeos:auth-expired', handleAuthExpired);
    };
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {showDevtools && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
