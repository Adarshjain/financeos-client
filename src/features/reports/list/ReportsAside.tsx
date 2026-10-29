import Link from 'next/link';
import React from 'react';

import { Button, Card, ListRow, Text } from '@/components/ds';

import { ASK_EXAMPLE, ASK_HREF, REPORT_TEMPLATES, templateHref } from './reportsList';

/** "Start from a template" and "Ask instead", under the list. */
export function ReportsAside() {
  return (
    <div className="grid grid-cols-1 gap-x-space-12 gap-y-space-8 desk:grid-cols-2 desk:gap-space-16 desk:items-start">
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
        <Card.Row>
          <div className="flex flex-col gap-space-8 min-w-0 flex-1">
            <Text variant="body" tone="ink-3">
              &ldquo;{ASK_EXAMPLE}&rdquo;
            </Text>
            <Text variant="caption" tone="ink-3">
              The answer comes back with a{' '}
              <Text variant="caption" as="span" tone="ink">
                Save as report
              </Text>{' '}
              button.
            </Text>
            <Button asChild variant="secondary" className="max-desk:w-full desk:self-start">
              <Link href={ASK_HREF} prefetch={false}>
                Ask the data
              </Link>
            </Button>
          </div>
        </Card.Row>
      </Card>
    </div>
  );
}
