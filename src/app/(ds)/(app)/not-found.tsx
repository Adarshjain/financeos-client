'use client';

import React from 'react';

import { PageNotFound } from '@/features/shell/PageNotFound';

/** Any /ds page that calls notFound() without its own not-found page. */
export default function DsAppNotFound() {
  return <PageNotFound shell={{ title: 'Not found' }} />;
}
