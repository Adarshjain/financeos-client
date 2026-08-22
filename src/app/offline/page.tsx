import { WifiOff } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Offline',
};

/**
 * Served by the service worker whenever a document request fails while the
 * device is offline. Every page in the app is server-rendered behind a session
 * cookie, so no real content can be shown without a network connection.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="rounded-full bg-muted p-4 text-muted-foreground">
        <WifiOff className="h-8 w-8" aria-hidden />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        FinanceOS needs a connection to load your accounts and transactions. This page will work
        again once you&apos;re back online.
      </p>
    </main>
  );
}
