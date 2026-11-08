import { renderHook } from '@testing-library/react';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

let data: unknown;
vi.mock('@/lib/query/hooks/useShellCounts', () => ({ useShellCounts: () => ({ data }) }));

import { useDataSourceIssues } from '../useDataSourceIssues';

describe('useDataSourceIssues', () => {
  it('sums connections and failed jobs', () => {
    data = { dataSources: { connections: 2, failedJobs: 3 } };
    expect(renderHook(() => useDataSourceIssues()).result.current).toEqual({ connections: 2, failedJobs: 3, total: 5 });
  });

  it.each([{ dataSources: null }, {}, undefined])('is zeros when the part is absent (%j)', (d) => {
    data = d;
    expect(renderHook(() => useDataSourceIssues()).result.current).toEqual({ connections: 0, failedJobs: 0, total: 0 });
  });

  it('draws zeros on the server render, whatever the cache holds', () => {
    data = { dataSources: { connections: 2, failedJobs: 3 } };
    function Probe() {
      return <span>{useDataSourceIssues().total}</span>;
    }
    expect(renderToString(<Probe />)).toContain('>0<');
  });
});
