import React from 'react';

import { Toaster } from '@/components/ds';

export default function DesignSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas font-text text-ink">
      {children}
      <Toaster />
    </div>
  );
}
