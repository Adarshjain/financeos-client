import React from 'react';

import { Root } from '@/components/ds';

export default function DesignSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Root>{children}</Root>;
}
