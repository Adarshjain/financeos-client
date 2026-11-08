import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ImportRecordResponse } from '@/lib/api/types';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { pinClock } from '@/test/pinClock';

import { ImportsScreen } from './ImportsScreen';

pinClock();

const rec = (over: Partial<ImportRecordResponse>): ImportRecordResponse =>
  ({
    id: 'statement:s1',
    kind: 'statement',
    source: 'upload',
    status: 'done',
    fileName: 'hdfc-oct.pdf',
    accountId: 'a1',
    accountName: 'HDFC Bank',
    periodStart: '2026-10-01',
    periodEnd: '2026-10-31',
    count: 42,
    errorMessage: null,
    createdAt: '2026-11-02T10:00:00Z',
    ...over,
  }) as unknown as ImportRecordResponse;

const props = { rows: [] as ImportRecordResponse[], totalElements: 0, totalPages: 0, page: 0, size: 25, kind: '' as const };

beforeEach(() => push.mockReset());

describe('ImportsScreen', () => {
  it('shows a row per import with its text, date and a link', () => {
    render(<ImportsScreen {...props} rows={[rec({}), rec({ id: 'epf:e1', kind: 'epf_passbook', accountId: null as never, accountName: null as never, fileName: null as never, count: 18 })]} totalElements={2} totalPages={1} />);
    const link = screen.getByRole('link', { name: /HDFC Bank statement/ });
    expect(link).toHaveAttribute('href', '/accounts/a1/statements');
    expect(link).toHaveTextContent('hdfc-oct.pdf · 1 Oct–31 Oct · 42 transactions');
    expect(link).toHaveTextContent('2 Nov');
    expect(link).not.toHaveTextContent("Couldn't import");
    expect(screen.getByRole('link', { name: /EPF passbook/ })).toHaveAttribute('href', '/investments/epf');
  });

  it('marks a failed import and a held file', () => {
    render(
      <ImportsScreen
        {...props}
        rows={[
          rec({ id: 'job:j2', status: 'failed', errorMessage: 'Could not read the file' }),
          rec({ id: 'held:h-1', status: 'held', accountName: null as never, accountId: null as never }),
        ]}
        totalElements={2}
        totalPages={1}
      />,
    );
    expect(screen.getByText("Couldn't import")).toBeInTheDocument();
    expect(screen.getByText('Could not read the file', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Waiting for an account')).toBeInTheDocument();
  });

  it('with nothing imported, says so and offers Import a file', () => {
    render(<ImportsScreen {...props} />);
    expect(screen.getByText('No imports yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Import a file' })).toHaveAttribute('href', '/import');
  });

  it('with a kind that matches nothing, offers Clear filters', () => {
    render(<ImportsScreen {...props} kind="broker" />);
    expect(screen.getByText('No imports match')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clear filters' })).toHaveAttribute('href', '/data-sources/imports');
  });

  it('has the Pager above and below the list, and a page press goes to that page in the address', () => {
    render(<ImportsScreen {...props} rows={[rec({})]} totalElements={60} totalPages={3} page={0} />);
    const pagers = screen.getAllByRole('navigation').length ? screen.getAllByRole('navigation') : screen.getAllByText(/of 60/);
    expect(pagers).toHaveLength(2);
    fireEvent.click(within(pagers[0] as HTMLElement).getByRole('button', { name: 'Page 2' }));
    expect(push).toHaveBeenCalledWith('/data-sources/imports?page=2', { scroll: false });
  });

  it('keeps the kind when paging', () => {
    render(<ImportsScreen {...props} rows={[rec({})]} totalElements={60} totalPages={3} page={1} kind="statement" />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Page 3' })[0]);
    expect(push).toHaveBeenCalledWith('/data-sources/imports?kind=statement&page=3', { scroll: false });
  });
});
