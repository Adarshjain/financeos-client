'use client';

import React from 'react';

import { AreaSectionsShell } from '@/features/shell/AreaSectionsShell';
import { areaCrumb } from '@/features/shell/navigation';
import { appHref } from '@/features/shell/routes';

import { dataSourcesSections } from './dataSourcesSections';

/**
 * The Data sources frame, applied once by the route layout: one column like Settings. The sections are listed
 * on the Settings page; a section is a drill-in under a top bar titled with its name and the back button to Settings.
 */
export function DataSourcesShell({ children }: { children: React.ReactNode }) {
  return (
    <AreaSectionsShell
      title="Data sources"
      crumb={areaCrumb('dataSources')}
      indexHref={appHref('/settings')}
      sections={dataSourcesSections}
    >
      {children}
    </AreaSectionsShell>
  );
}
