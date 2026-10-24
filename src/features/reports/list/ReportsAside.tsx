import Link from 'next/link';
import React from 'react';

import { Button, Card, CardRow, ListRow, Text } from '@/components/ds';

import { REPORT_TEMPLATES, templateHref } from './reportsList';

/** "Start from a template" and "Ask instead", under the list. */
export function ReportsAside() {
  return (
    <div className="grid grid-cols-1 gap-space-12 desk:grid-cols-2 desk:gap-space-16 desk:items-start">
      <Card title="Start from a template" subtitle="One click, then tweak">
        {REPORT_TEMPLATES.map((t) => (
          <ListRow
            key={t.id}
            title={t.label}
            trailing={
              <Button asChild variant="secondary" size="sm">
                <Link href={templateHref(t)} prefetch={false} aria-label={`Use ${t.label}`}>
                  Use
                </Link>
              </Button>
            }
          />
        ))}
      </Card>
      <Card title="Ask instead" subtitle="Chat turns a question into a saved report">
        <CardRow>
          <div className="flex flex-col gap-space-8 min-w-0">
            <Text variant="body" tone="ink-3">
              &ldquo;dining spend per month on Regalia, this year&rdquo;
            </Text>
            <Text variant="caption" tone="ink-3">
              The answer comes back with a{' '}
              <Text variant="caption" as="span" tone="ink">
                Save as report
              </Text>{' '}
              button.
            </Text>
          </div>
        </CardRow>
      </Card>
    </div>
  );
}
