import { MobileNav } from '@/components/layout/MobileNav';
import { Sidebar } from '@/components/layout/Sidebar';
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
        <main className="md:p-6 lg:pt-6">{children}</main>
      </div>
    </div>
  );
}
