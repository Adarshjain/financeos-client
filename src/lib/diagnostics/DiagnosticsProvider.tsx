'use client';

import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useEffect, useMemo } from 'react';

import { getFaro } from '@/instrumentation-client';
import { errorLog } from '@/lib/diagnostics/errorLog';
import { setNavigator } from '@/lib/diagnostics/navigate';

interface DiagnosticsContextValue {
  pageRequestId?: string;
  admin: boolean;
  sessionId?: string;
}

const DiagnosticsContext = createContext<DiagnosticsContextValue | null>(null);

export function useDiagnostics(): DiagnosticsContextValue {
  const ctx = useContext(DiagnosticsContext);
  return (
    ctx ?? {
      pageRequestId: undefined,
      admin: false,
      sessionId: undefined,
    }
  );
}

interface DiagnosticsProviderProps {
  pageRequestId?: string;
  userId: string;
  admin?: boolean;
  children: React.ReactNode;
}

export function DiagnosticsProvider({
  pageRequestId,
  userId,
  admin = false,
  children,
}: DiagnosticsProviderProps) {
  const router = useRouter();

  useEffect(() => {
    setNavigator((path: string) => router.push(path));
    return () => {
      setNavigator(null);
    };
  }, [router]);

  useEffect(() => {
    errorLog.setOwner(userId);
  }, [userId]);

  useEffect(() => {
    const handleAuthExpired = () => {
      errorLog.clear();
    };

    window.addEventListener('financeos:auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('financeos:auth-expired', handleAuthExpired);
    };
  }, []);

  const sessionId = useMemo(() => {
    try {
      return getFaro()?.api.getSession()?.id;
    } catch {
      return undefined;
    }
  }, []);

  const value = useMemo(
    () => ({
      pageRequestId,
      admin,
      sessionId,
    }),
    [pageRequestId, admin, sessionId],
  );

  return (
    <DiagnosticsContext.Provider value={value}>
      {children}
    </DiagnosticsContext.Provider>
  );
}
