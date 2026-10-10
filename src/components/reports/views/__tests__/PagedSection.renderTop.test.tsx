import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PagedSection } from '@/components/reports/views/PagedSection';
import { stubPhone } from '@/test/stubPhone';

vi.mock(
  '@/components/ui/select',
  async () => (await import('@/test/mockSelect')).selectMock
);

const toolbar = (pager: ReactNode | null) => (
  <div data-testid="toolbar">
    <span>Sort</span>
    {pager}
  </div>
);

function renderSection(page: {
  number: number;
  size: number;
  totalPages: number;
  totalElements: number;
}) {
  const onPageChange = vi.fn();
  render(
    <PagedSection
      page={page}
      onPageChange={onPageChange}
      onSizeChange={vi.fn()}
      renderTop={toolbar}
      phoneCompact
    >
      <ul data-testid="list" />
    </PagedSection>
  );
  return { onPageChange };
}

describe('PagedSection renderTop', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('puts the top pager inside the given toolbar, above the list', () => {
    renderSection({ number: 0, size: 10, totalPages: 5, totalElements: 45 });
    const bar = screen.getByTestId('toolbar');
    expect(
      within(bar).getByRole('navigation', { name: 'Pagination' })
    ).toBeInTheDocument();
    expect(
      within(bar).getByRole('combobox', { name: 'Rows per page' })
    ).toBeInTheDocument();
    expect(
      bar.compareDocumentPosition(screen.getByTestId('list')) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('still renders the toolbar, with no pager, for an empty first page', () => {
    renderSection({ number: 0, size: 10, totalPages: 0, totalElements: 0 });
    expect(screen.getByTestId('toolbar')).toHaveTextContent('Sort');
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
  });

  it('paging from the bottom brings the toolbar back into view', () => {
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    const { onPageChange } = renderSection({
      number: 0,
      size: 10,
      totalPages: 5,
      totalElements: 45,
    });
    const bottom = screen.getAllByRole('navigation', { name: 'Pagination' })[1];
    fireEvent.click(within(bottom).getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(
      (scroll.mock.contexts[0] as HTMLElement).contains(
        screen.getByTestId('toolbar')
      )
    ).toBe(true);
  });

  it('keeps the bottom pager full size on a phone', () => {
    stubPhone(true);
    renderSection({ number: 0, size: 10, totalPages: 5, totalElements: 45 });
    const [top, bottom] = screen.getAllByRole('navigation', {
      name: 'Pagination',
    });
    expect(within(top).getByRole('button', { name: 'Next page' })).toHaveClass(
      'h-7'
    );
    expect(
      within(bottom).getByRole('button', { name: 'Next page' })
    ).toHaveClass('h-8');
    expect(
      screen
        .getAllByText('45 rows')
        .map((n) => n.parentElement?.className ?? '')
    ).toEqual([
      expect.stringContaining('hidden'),
      expect.not.stringContaining('hidden'),
    ]);
  });
});
