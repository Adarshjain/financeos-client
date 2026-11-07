'use client';

import React from 'react';

import { AreaSectionsShell } from '@/features/shell/AreaSectionsShell';
import { areaCrumb } from '@/features/shell/navigation';

import { DATA_SOURCES_HREF, dataSourcesSections } from './dataSourcesSections';

/**
 * The Data sources frame, applied once by the route layout: one column like Settings. `/data-sources` lists the
 * sections; a section is a drill-in under a top bar titled with its name and the back button to Data sources.
 */
export function DataSourcesShell({ children }: { children: React.ReactNode }) {
  return (
    <AreaSectionsShell
      title="Data sources"
      crumb={areaCrumb('dataSources')}
      indexHref={DATA_SOURCES_HREF}
      sections={dataSourcesSections}
    >
      {children}
    </AreaSectionsShell>
  );
}
