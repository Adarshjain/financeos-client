import Link from 'next/link';
import React from 'react';

import { Card, EmptyState, ListRow, SectionHeader } from '@/components/ds';

export default function DsIndexPage() {
  return (
    <div className="max-w-dialog-md mx-auto space-y-space-24">
      {/* Signed out pages */}
      <Card>
        <SectionHeader label="Signed out" borderTop={false} />
        <Link href="/ds/login" className="no-underline text-inherit block">
          <ListRow
            title="Sign in"
            subtitle="/ds/login"
            chevron
            clickable
          />
        </Link>
        <Link href="/ds/signup" className="no-underline text-inherit block">
          <ListRow
            title="Sign up"
            subtitle="/ds/signup"
            chevron
            clickable
          />
        </Link>
        <Link href="/ds/offline" className="no-underline text-inherit block">
          <ListRow
            title="Offline"
            subtitle="/ds/offline"
            chevron
            clickable
          />
        </Link>
      </Card>

      {/* Signed in section */}
      <Card>
        <SectionHeader label="Signed in" borderTop={false} />
        <EmptyState description="No signed-in pages yet." compact />
      </Card>
    </div>
  );
}
