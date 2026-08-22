import { JobsProvider } from '@/components/jobs/JobsProvider';
import { MobileNav } from '@/components/layout/MobileNav';
import {
  PageActionBarProvider,
  PageActionBarSlot,
} from '@/components/layout/PageActionBarContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { requireAuth } from '@/lib/auth';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <JobsProvider>
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
            <main className="md:p-6 lg:pt-6 pb-[var(--safe-bottom)]">{children}</main>
          </div>
        </div>
      </PageActionBarProvider>
    </JobsProvider>
  );
}
