'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';

import { getQueryClient } from '@/lib/query/client';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());
  const router = useRouter();

  useEffect(() => {
    let redirected = false;
    const handleAuthExpired = () => {
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
      {process.env.NODE_ENV !== 'production' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
