'use client';

import React from 'react';

import { PageNotFound } from '@/features/shell/PageNotFound';

/** Shown when an account id does not exist. It sits above [id] because the account layout is what raises it. */
export default function DsAccountNotFound() {
  return (
    <PageNotFound
      what="Account"
      description="It may have been deleted."
      backPath="/accounts"
      backLabel="Back to accounts"
      shell={{ crumb: 'Money', title: 'Accounts' }}
    />
  );
}
