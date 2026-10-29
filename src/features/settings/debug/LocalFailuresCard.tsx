'use client';

import React, { useEffect, useRef } from 'react';

import { Button, Card, CardEmpty, ListRow, Text } from '@/components/ds';

import { failureLine } from './debugModel';
import { useLocalFailures } from './useLocalFailures';

interface LocalFailuresCardProps {
  highlightRef?: string;
  onSelectRef?: (ref: string) => void;
}

/** The last failures recorded in this browser; tapping a row copies its reference and selects it. */
export function LocalFailuresCard({ highlightRef, onSelectRef }: LocalFailuresCardProps) {
  const { records, copyRef, copyAll, share, clear } = useLocalFailures();
  const highlighted = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (highlightRef && highlighted.current) {
      highlighted.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightRef, records]);

  return (
    <Card
      title={`Recent failures on this device · ${records.length}`}
      subtitle="Tap one to copy its reference and look it up"
      action={
        records.length > 0 ? (
          <Text variant="label" as="div" className="flex items-center gap-space-14">
            <Button variant="link" size="sm" onClick={copyAll}>
              Copy all
            </Button>
            <Button variant="link" size="sm" onClick={share}>
              Share
            </Button>
            <Button variant="link" size="sm" onClick={clear}>
              Clear
            </Button>
          </Text>
        ) : undefined
      }
    >
      {records.length === 0 ? (
        <CardEmpty>No local failures yet</CardEmpty>
      ) : (
        records.map((rec, idx) => {
          const isHighlighted = Boolean(highlightRef) && rec.ref === highlightRef;
          return (
            <ListRow
              key={`${rec.at}-${idx}`}
              ref={isHighlighted ? highlighted : null}
              highlighted={isHighlighted}
              title={
                <Text mono variant="body-strong">
                  {rec.ref}
                </Text>
              }
              subtitle={failureLine(rec)}
              onClick={() => {
                copyRef(rec);
                onSelectRef?.(rec.ref);
              }}
            />
          );
        })
      )}
    </Card>
  );
}
