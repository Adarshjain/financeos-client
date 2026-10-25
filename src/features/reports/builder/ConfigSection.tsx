import React from 'react';

import { SectionHeader, Text } from '@/components/ds';

/** One section of the editor's form: an optional titled header (with an optional link action at its end), then its fields. */
export function ConfigSection({ title, action, children }: { title?: string; action?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-space-12">
      {title ? (
        <SectionHeader as="h2" variant="strong" sticky={false} className="px-0" action={action ? <Text variant="label" as="span">{action}</Text> : undefined}>
          {title}
        </SectionHeader>
      ) : null}
      {children}
    </section>
  );
}
