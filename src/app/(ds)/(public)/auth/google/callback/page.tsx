'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useRef, useState } from 'react';

import { handleGoogleCallbackAction } from '@/actions/auth';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { Illustration } from '@/components/organisms/Illustration/Illustration';

function Authenticating({ done }: { done?: boolean }) {
  return (
    <EmptyState
      illustration={<Illustration variant="signin" />}
      title={done ? 'Success!' : 'Authenticating...'}
      description={
        done
          ? 'Redirecting you to the dashboard...'
          : 'Please wait while we verify your Google account.'
      }
    />
  );
}

function GoogleCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  // An OAuth authorization code is single-use. This effect keys on
  // [searchParams, router], so a re-run (StrictMode's double-invoke in dev, or
  // either reference changing before the exchange settles) would post the same
  // code twice — the second attempt fails and flips the page to
  // "Authentication Failed" even though the first exchange already set the
  // session cookie.
  const exchangeStartedRef = useRef(false);

  useEffect(() => {
    if (exchangeStartedRef.current) return;
    exchangeStartedRef.current = true;

    const processCallback = async () => {
      const code = searchParams.get('code') || undefined;
      const state = searchParams.get('state') || undefined;
      const error = searchParams.get('error') || undefined;

      if (error) {
        setStatus('error');
        setErrorMessage(error);

        // Redirect to login after a short delay
        setTimeout(() => {
          router.push(`/login?error=${encodeURIComponent(error)}`);
        }, 2000);
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMessage('No authorization code received');
        setTimeout(() => {
          router.push('/login?error=no_code');
        }, 2000);
        return;
      }

      try {
        const result = await handleGoogleCallbackAction(code, state, error);

        if (result.success) {
          setStatus('success');
          // Force a full page reload to ensure the session cookie is sent with the request
          window.location.href = '/home';
        } else {
          setStatus('error');
          setErrorMessage(result.error.message);
          setTimeout(() => {
            router.push(`/login?error=${encodeURIComponent(result.error.message)}`);
          }, 3000);
        }
      } catch {
        setStatus('error');
        setErrorMessage('An unexpected error occurred');
        setTimeout(() => {
          router.push('/login?error=unknown');
        }, 3000);
      }
    };

    processCallback();
  }, [searchParams, router]);

  return (
    <main className="min-h-dvh flex items-center justify-center p-space-20">
      {status === 'error' ? (
        <EmptyState
          illustration={<Illustration variant="error" />}
          title="Authentication Failed"
          description={`${errorMessage}. Redirecting to login...`}
        />
      ) : (
        <Authenticating done={status === 'success'} />
      )}
    </main>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh flex items-center justify-center p-space-20">
          <Authenticating />
        </main>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
