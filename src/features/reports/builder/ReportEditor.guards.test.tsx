import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetInAppNavigation } from '@/features/shell/navigationStore';
import type { KpiData, ReportResponse } from '@/lib/reports.types';
import type { ReportCatalog } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { catalogFixture, savedChart } from './editor.fixtures';
import { ReportEditor, type ReportEditorProps } from './ReportEditor';

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/reports/new', useSearchParams: () => new URLSearchParams() }));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));

vi.mock('@/components/organisms/Chart/Chart', () => ({
  Chart: ({ data }: { data: { chartType: string } }) => <div data-testid="chart" data-type={data.chartType} />,
}));

const user = userEvent.setup({ pointerEventsCheck: 0 });

const RUN = '/api/v1/reports/data';
const runCalls = () => api.POST.mock.calls.filter(([path]) => path === RUN);
const writeCalls = () => api.POST.mock.calls.filter(([path]) => path === '/api/v1/reports');


const kpiResult: KpiData = {
  type: 'KPI',
  value: 1,
  measure: 'amount',
  aggregation: 'sum',
  format: 'currency',
  comparison: null,
  meta: { rowCount: 1, dateRange: null },
} as unknown as KpiData;

/** The fixture catalog with guards: Amount needs a Category split or filter; Spend cannot be averaged. */
const guarded: ReportCatalog = {
  ...catalogFixture,
  datasources: catalogFixture.datasources.map((ds) =>
    ds.name !== 'transactions'
      ? ds
      : {
          ...ds,
          fields: ds.fields.map((f) =>
            f.name === 'amount'
              ? { ...f, guards: [{ kind: 'needs' as const, fields: ['category'], aggregations: null, reason: 'mixes debits and credits' }] }
              : f.name === 'spend'
                ? { ...f, guards: [{ kind: 'no_aggregation' as const, aggregations: ['avg' as const], reason: 'cannot be averaged' }] }
                : f,
          ),
        },
  ),
};

/** A saved report that already breaks the Amount guard: no Category split. */
const blockedReport: ReportResponse = {
  ...savedChart,
  definition: { chartType: 'bar', dimension: { field: 'type' }, measure: { field: 'amount', aggregation: 'sum' }, filters: [] },
} as ReportResponse;

beforeEach(() => {
  vi.clearAllMocks();
  resetInAppNavigation();
  api.GET.mockResolvedValue({ data: undefined });
  api.POST.mockImplementation(async (path: string) => (path === RUN ? { data: kpiResult } : { data: { id: 'new1', name: 'x' } }));
  api.PUT.mockResolvedValue({ data: blockedReport });
  api.DELETE.mockResolvedValue({});
});

const setup = (props: Partial<ReportEditorProps> = {}) => renderWithQuery(<ReportEditor catalog={guarded} {...props} />);

async function pick(field: string, option: string | RegExp) {
  await user.click(screen.getByRole('combobox', { name: field }));
  await user.click(await screen.findByRole('option', { name: option }));
}

const type = async (label: string, text: string) => {
  const box = screen.getByLabelText(label);
  await user.clear(box);
  await user.type(box, text);
};

const BANNER = "These numbers don't add up";
const AMOUNT = 'Amount mixes debits and credits. Split by Category, or filter it to one value.';

describe('Combination guards in a new report', () => {
  it('shows a warning for a blocked draft', async () => {
    setup();
    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();
    await pick('Measure', 'Amount');
    expect(await screen.findByText(BANNER)).toBeInTheDocument();
    expect(screen.getByText(AMOUNT)).toBeInTheDocument();
  });

  it('does not write a blocked report', async () => {
    setup();
    await pick('Measure', 'Amount');
    await type('Report name', 'Mixed');
    await user.click(screen.getByRole('button', { name: 'Add report' }));
    expect(writeCalls()).toHaveLength(0);
    expect(screen.getByText(BANNER)).toBeInTheDocument();
  });

  it('still previews a blocked draft', async () => {
    setup();
    await pick('Measure', 'Amount');
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    await waitFor(() => expect(runCalls()).toHaveLength(1));
  });

  it('disables a blocked aggregation with its reason', async () => {
    setup();
    await pick('Measure', 'Spend');
    await user.click(screen.getByRole('combobox', { name: 'Aggregation' }));
    const option = await screen.findByRole('option', { name: /Average/ });
    expect(option).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Spend cannot be averaged.')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Sum' })).not.toHaveAttribute('aria-disabled', 'true');
  });
});

describe('Combination guards in a saved report', () => {
  const props = (over: Partial<ReportEditorProps> = {}): Partial<ReportEditorProps> => ({ report: blockedReport, ...over });

  it('opens with the warning and can be renamed and saved', async () => {
    setup(props());
    expect(screen.getByText(BANNER)).toBeInTheDocument();
    await type('Report name', 'Renamed');
    await user.click(screen.getByRole('button', { name: 'Save report' }));
    await waitFor(() => expect(api.PUT).toHaveBeenCalledTimes(1));
  });

  it('cannot be saved once its definition changes while still blocked', async () => {
    setup(props());
    await type('Show top', '3');
    await user.click(screen.getByRole('button', { name: 'Save report' }));
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it('can be saved after a change that fixes it', async () => {
    setup(props());
    await pick('Dimension (X-axis)', 'Category');
    await waitFor(() => expect(screen.queryByText(BANNER)).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Save report' }));
    await waitFor(() => expect(api.PUT).toHaveBeenCalledTimes(1));
  });

  it('cannot be saved as a new report even when only renamed', async () => {
    setup(props());
    await type('Report name', 'Copy');
    await user.click(screen.getByRole('button', { name: 'More actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Save as new' }));
    expect(writeCalls()).toHaveLength(0);
  });
});
