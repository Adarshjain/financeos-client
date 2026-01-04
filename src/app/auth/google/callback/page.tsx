'use client';

import { Loader2 } from 'lucide-react';
import { useRouter,useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { handleGoogleCallbackAction } from '@/actions/auth';

export default function GoogleCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>(
    'loading'
  );
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
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
          window.location.href = '/dashboard';
        } else {
          setStatus('error');
          setErrorMessage(result.error.message);
          setTimeout(() => {
            router.push(
              `/login?error=${encodeURIComponent(result.error.message)}`
            );
          }, 3000);
        }
      } catch (err) {
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-center max-w-md w-full">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-emerald-600 animate-spin" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Authenticating...
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Please wait while we verify your Google account.
              </p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-emerald-600 animate-spin" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Success!
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Redirecting you to the dashboard...
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Authentication Failed
              </h2>
              <p className="text-red-600 dark:text-red-400 font-medium">
                {errorMessage}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Redirecting to login...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
