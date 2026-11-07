'use client';

import { usePathname } from 'next/navigation';
import React from 'react';

import { activeAreaSection,type AreaSection } from './areaSections';
import { ShellPage } from './ShellPage';

/**
 * The frame of a one-column area, applied once by the area's route layout: the area's own page is titled `title`;
 * a section is a drill-in under a top bar titled with its name and the back button to the area's page at every width.
 */
export function AreaSectionsShell({
  title,
  crumb,
  indexHref,
  sections,
  children,
}: {
  title: string;
  crumb: string;
  indexHref: string;
  sections: AreaSection[];
  children: React.ReactNode;
}) {
  const active = activeAreaSection(sections, usePathname());

  return (
    <ShellPage title={active ? active.label : title} crumb={crumb} backHref={active ? indexHref : undefined}>
      <div className="w-full max-w-container-lg mx-auto">{children}</div>
    </ShellPage>
  );
}
