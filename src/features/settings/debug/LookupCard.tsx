'use client';

import React, { useState } from 'react';

import { Button, Card, SegmentedControl, Text, TextField } from '@/components/ds';

import { asRefType, REF_TYPE_OPTIONS, type RefType } from './debugModel';

interface LookupCardProps {
  admin: boolean;
  initialRef: string;
  initialType: string;
  isLoading: boolean;
  onSearch: (ref: string, type: string) => void;
}

/** The reference lookup form; non-admins get a note and no form, so the API is never called. */
export function LookupCard({ admin, initialRef, initialType, isLoading, onSearch }: LookupCardProps) {
  const [ref, setRef] = useState(initialRef);
  const [type, setType] = useState<RefType>(asRefType(initialType));

  if (!admin) {
    return (
      <Card>
        <Card.Empty>Look-ups are for admins. Send the reference to the developer.</Card.Empty>
      </Card>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = ref.trim();
    if (clean) onSearch(clean, type);
  };

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-space-8 p-space-16">
        <div className="flex flex-wrap items-center gap-space-8">
          <div className="flex-1 basis-[220px]">
            <TextField
              aria-label="Reference"
              value={ref}
              onValueChange={setRef}
              placeholder="HM6HK5G6"
            />
          </div>
          <SegmentedControl<RefType>
            aria-label="Reference type"
            options={REF_TYPE_OPTIONS}
            value={type}
            onValueChange={setType}
          />
          <Button type="submit" variant="primary" disabled={isLoading || !ref.trim()}>
            Look up
          </Button>
        </div>
        <Text variant="label" tone="ink-3">
          Enter a request id or an error id (8 characters, e.g. HM6HK5G6) from an error message.
        </Text>
      </form>
    </Card>
  );
}
