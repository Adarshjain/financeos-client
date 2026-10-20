import Link from 'next/link';
import React from 'react';

import { Card, ListRow, SectionHeader } from '@/components/ds';
import { ShellPage } from '@/features/shell/ShellPage';

export default function DsIndexPage() {
  return (
    <ShellPage title="New design">
      <div className="max-w-container-md mx-auto space-y-space-24">
        {/* Signed out pages */}
        <Card>
          <SectionHeader borderTop={false}>Signed out</SectionHeader>
          <ListRow asChild title="Sign in" subtitle="/ds/login" chevron>
            <Link href="/ds/login" />
          </ListRow>
          <ListRow asChild title="Sign up" subtitle="/ds/signup" chevron>
            <Link href="/ds/signup" />
          </ListRow>
          <ListRow asChild title="Offline" subtitle="/ds/offline" chevron>
            <Link href="/ds/offline" />
          </ListRow>
        </Card>

        {/* Signed in section */}
        <Card>
          <SectionHeader borderTop={false}>Signed in</SectionHeader>
          <ListRow asChild title="Accounts" subtitle="/ds/accounts" chevron>
            <Link href="/ds/accounts" />
          </ListRow>
          <ListRow asChild title="Settings" subtitle="/ds/settings" chevron>
            <Link href="/ds/settings" />
          </ListRow>
        </Card>
      </div>
    </ShellPage>
  );
}
