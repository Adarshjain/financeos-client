import Link from 'next/link';
import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { ListRow } from '@/components/ds/ListRow/ListRow';

import { settingsSection } from './settingsSections';

/** Debug and the Storybook. */
export function HelpCard() {
  const debug = settingsSection('debug');
  return (
    <Card title="Help">
      <ListRow asChild borderTop chevron title={debug.label}>
        <Link href={debug.href} prefetch={false} />
      </ListRow>
      <ListRow asChild borderTop chevron title="Storybook" subtitle="Every Dinero component, live">
        {/* A static page under public/, not a Next route: a plain anchor makes it a full page load. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/storybook" />
      </ListRow>
    </Card>
  );
}
