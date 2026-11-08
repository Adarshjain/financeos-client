'use client';

import React from 'react';

import { DateField } from '@/components/ds/DateField/DateField';
import { Select } from '@/components/ds/Select/Select';

import type { OldCardState } from './useOldCard';

const iso = (v: string | { start?: string; end?: string }) => (typeof v === 'string' ? v : '');

/** Holder (only when the account has several) and the opened and closed dates of an old card. */
export function OldCardFields({
  state,
  today,
  errors,
  disabled,
}: {
  state: OldCardState;
  today: string;
  errors?: Record<string, string>;
  disabled?: boolean;
}) {
  return (
    <>
      {state.showHolderPicker ? (
        <Select
          label="Cardholder"
          value={state.cardholderId}
          onValueChange={(v) => state.setCardholderId(v as string)}
          options={state.holderOptions}
          disabled={disabled}
        />
      ) : null}
      <DateField
        label="Opened on"
        today={today}
        maxDate={today}
        value={state.issuedOn}
        onValueChange={(v) => state.setIssuedOn(iso(v))}
        helper={state.hint ?? undefined}
        error={errors?.issuedOn}
        disabled={disabled}
      />
      <DateField
        label="Closed on"
        today={today}
        maxDate={today}
        value={state.closedOn}
        onValueChange={(v) => state.setClosedOn(iso(v))}
        error={errors?.closedOn}
        disabled={disabled}
      />
    </>
  );
}
