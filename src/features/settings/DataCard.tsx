'use client';

import Link from 'next/link';
import React, { Suspense, use } from 'react';

import { Badge } from '@/components/ds/Badge/Badge';
import { Card } from '@/components/ds/Card/Card';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Text } from '@/components/ds/Text/Text';

import { settingsSection } from './settingsSections';

/**
 * The values on the Data rows, each a promise so the page renders at once and a value streams in when its
 * request settles. A promise resolves to undefined when its request failed: the row shows none.
 */
export interface SettingsDataValues {
  /** How many Gmail items need attention. */
  attentionCount: Promise<number | undefined>;
  /** How many AI keys are saved. */
  aiKeyCount: Promise<number | undefined>;
}

function AttentionValue({ promise }: { promise: Promise<number | undefined> }) {
  const count = use(promise);
  return count ? <Badge tone="warning" size="sm">{count} needs attention</Badge> : null;
}

function AiValue({ promise }: { promise: Promise<number | undefined> }) {
  const count = use(promise);
  return count === undefined ? null : (
    <Text variant="label" tone="ink-3">{count === 0 ? 'None' : `${count} ${count === 1 ? 'key' : 'keys'}`}</Text>
  );
}

/** Connections and AI, each value in its own Suspense so the row never waits for it. */
export function DataCard({ values }: { values: SettingsDataValues }) {
  const connections = settingsSection('connections');
  const ai = settingsSection('ai');
  return (
    <Card title="Data">
      <ListRow
        asChild
        borderTop
        chevron
        title={connections.label}
        trailing={<Suspense fallback={null}><AttentionValue promise={values.attentionCount} /></Suspense>}
      >
        <Link href={connections.href} prefetch={false} />
      </ListRow>
      <ListRow
        asChild
        borderTop
        chevron
        title={ai.label}
        trailing={<Suspense fallback={null}><AiValue promise={values.aiKeyCount} /></Suspense>}
      >
        <Link href={ai.href} prefetch={false} />
      </ListRow>
    </Card>
  );
}
