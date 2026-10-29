import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { entriesFixture, ledgerFixture, personFixture } from '@/features/lendings/person/personModel.fixtures';
import type { PersonScreenProps } from '@/features/lendings/person/PersonScreen';

import DsPersonPage from './page';

const loadPersonPage = vi.hoisted(() => vi.fn());
vi.mock('@/features/lendings/person/personData', () => ({ loadPersonPage }));
vi.mock('@/lib/auth', () => ({ requireAuth: async () => ({ displayName: 'Adarsh' }) }));

let viewProps: PersonScreenProps | undefined;
vi.mock('@/features/lendings/person/PersonScreen', () => ({
  PersonScreen: (props: PersonScreenProps) => {
    viewProps = props;
    return <p>person view</p>;
  },
}));

vi.mock('@/lib/date-range', async (orig) => ({
  ...(await orig<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-13',
}));

async function renderPage(searchParams: { page?: string; size?: string; export?: string } = {}) {
  render(await DsPersonPage({ params: Promise.resolve({ id: 'p1' }), searchParams: Promise.resolve(searchParams) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  viewProps = undefined;
  loadPersonPage.mockImplementation(async (_id: string, state: unknown) => ({
    cp: personFixture(),
    ledger: ledgerFixture(entriesFixture()),
    state,
  }));
});

describe('/loans/lendings/[id]', () => {
  it('loads this person for the page and size in the URL and hands the view its data, today and your name', async () => {
    await renderPage({ page: '3', size: '10' });
    expect(screen.getByText('person view')).toBeInTheDocument();
    expect(loadPersonPage).toHaveBeenCalledWith('p1', { page: 2, size: 10 });
    expect(viewProps?.cp.name).toBe('Rahul Sharma');
    expect(viewProps?.today).toBe('2026-10-13');
    expect(viewProps?.myName).toBe('Adarsh');
    expect(viewProps?.state).toEqual({ page: 2, size: 10 });
  });

  it('hands the view the page the loader clamped to', async () => {
    loadPersonPage.mockResolvedValue({
      cp: personFixture(),
      ledger: ledgerFixture(entriesFixture()),
      state: { page: 1, size: 10 },
    });
    await renderPage({ page: '100', size: '10' });
    expect(viewProps?.state).toEqual({ page: 1, size: 10 });
  });

  it('falls back to the first page of 25 for junk in the URL', async () => {
    await renderPage({ page: 'x', size: '3' });
    expect(viewProps?.state).toEqual({ page: 0, size: 25 });
  });

  it('opens Export ledger on load only for ?export=1', async () => {
    await renderPage({ export: '1' });
    expect(viewProps?.openExport).toBe(true);
    await renderPage({ export: '0' });
    expect(viewProps?.openExport).toBe(false);
    await renderPage();
    expect(viewProps?.openExport).toBe(false);
  });
});
