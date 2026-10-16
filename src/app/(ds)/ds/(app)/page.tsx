import Link from 'next/link';
import React from 'react';

import { Card, EmptyState, ListRow, SectionHeader } from '@/components/ds';

export default function DsIndexPage() {
  return (
    <div className="max-w-container-md mx-auto space-y-space-24">
      {/* Signed out pages */}
      <Card>
        <SectionHeader label="Signed out" borderTop={false} />
        <ListRow
          asChild
          title="Sign in"
          subtitle="/ds/login"
          chevron
        >
          <Link href="/ds/login" />
        </ListRow>
        <ListRow
          asChild
          title="Sign up"
          subtitle="/ds/signup"
          chevron
        >
          <Link href="/ds/signup" />
        </ListRow>
        <ListRow
          asChild
          title="Offline"
          subtitle="/ds/offline"
          chevron
        >
          <Link href="/ds/offline" />
        </ListRow>
      </Card>

      {/* Signed in section */}
      <Card>
        <SectionHeader label="Signed in" borderTop={false} />
        <EmptyState description="No signed-in pages yet." compact />
      </Card>
    </div>
  );
}
