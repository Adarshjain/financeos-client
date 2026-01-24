import { MobileNav } from '@/components/layout/mobile-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { requireAuth } from '@/lib/auth';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Desktop Sidebar */}
      <Sidebar userEmail={user.email} />

      {/* Mobile Navigation */}
      <MobileNav userEmail={user.email} />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Desktop Header */}
        {/*<Header user={user} />*/}

        {/* Page Content */}
        <main className="p-4 md:p-6 pb-[4.5rem] lg:pt-6">{children}</main>
      </div>
    </div>
  );
}
