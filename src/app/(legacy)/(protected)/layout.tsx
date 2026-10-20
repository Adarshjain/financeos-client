import { headers } from 'next/headers';

import { MobileNav } from '@/components/layout/MobileNav';
import {
  PageActionBarProvider,
  PageActionBarSlot,
} from '@/components/layout/PageActionBarContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { requireAuth } from '@/lib/auth';
import { DiagnosticsProvider } from '@/lib/diagnostics/DiagnosticsProvider';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const headerStore = await headers();
  const pageRequestId = headerStore.get('x-request-id') ?? undefined;

  return (
    <DiagnosticsProvider pageRequestId={pageRequestId} userId={user.id} admin={user.admin}>
      <PageActionBarProvider>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
          {/* Desktop Sidebar */}
          <Sidebar userEmail={user.email} />

          {/* Mobile Page Action Bar (stacked above MobileNav) */}
          <PageActionBarSlot />

          {/* Mobile Navigation */}
          <MobileNav userEmail={user.email} />

          {/* Main Content */}
          <div className="lg:pl-64">
            <main className="md:p-6 lg:pt-6">{children}</main>
          </div>
        </div>
      </PageActionBarProvider>
    </DiagnosticsProvider>
  );
}
