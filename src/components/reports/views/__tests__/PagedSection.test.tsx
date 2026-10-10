import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PagedSection } from '@/components/reports/views/PagedSection';

vi.mock(
  '@/components/ui/select',
  async () => (await import('@/test/mockSelect')).selectMock
);

const many = { number: 1, size: 10, totalPages: 5, totalElements: 45 };

function renderSection(
  page = many,
  onPageChange = vi.fn(),
  onSizeChange = vi.fn()
) {
  render(
    <PagedSection
      page={page}
      onPageChange={onPageChange}
      onSizeChange={onSizeChange}
      unit="txn"
    >
      <ul data-testid="list">
        <li>row</li>
      </ul>
    </PagedSection>
  );
  return { onPageChange, onSizeChange };
}

/** The pagers in document order, each with whether it sits before or after the list. */
function pagers() {
  const list = screen.getByTestId('list');
  return screen
    .getAllByRole('navigation', { name: 'Pagination' })
    .map((nav) => ({
      nav,
      before: !!(
        nav.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING
      ),
    }));
}

describe('PagedSection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('puts a pager above and below the list when there is more than one page', () => {
    renderSection();
    expect(pagers().map((p) => p.before)).toEqual([true, false]);
    expect(screen.getAllByText('45 txns')).toHaveLength(2);
  });

  it('keeps the page-size control on the top pager only', () => {
    const { onSizeChange } = renderSection();
    expect(
      screen.getAllByRole('combobox', { name: 'Rows per page' })
    ).toHaveLength(1);
    fireEvent.click(screen.getByRole('option', { name: '25 / page' }));
    expect(onSizeChange).toHaveBeenCalledWith(25);
  });

  it('pages from the top pager without scrolling', () => {
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    const { onPageChange } = renderSection();
    fireEvent.click(
      within(pagers()[0].nav).getByRole('button', { name: 'Next page' })
    );
    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(scroll).not.toHaveBeenCalled();
  });

  it('pages from the bottom pager and brings the top of the list back into view', () => {
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    const { onPageChange } = renderSection();
    fireEvent.click(
      within(pagers()[1].nav).getByRole('button', { name: 'Page 4' })
    );
    expect(onPageChange).toHaveBeenCalledWith(3);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
    // It scrolls to the top pager's wrapper, which sits before the list.
    const target = scroll.mock.contexts[0] as HTMLElement;
    expect(target.contains(pagers()[0].nav)).toBe(true);
  });

  it('shows only the top pager (with the count and size control) on a single page', () => {
    renderSection({ number: 0, size: 10, totalPages: 1, totalElements: 4 });
    expect(screen.getAllByText('4 txns')).toHaveLength(1);
    expect(
      screen.getByRole('combobox', { name: 'Rows per page' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
  });

  it('shows no pager at all for an empty first page, leaving the list empty state alone', () => {
    renderSection({ number: 0, size: 10, totalPages: 0, totalElements: 0 });
    expect(screen.getByTestId('list')).toBeInTheDocument();
    expect(screen.queryByText(/txns?$/)).toBeNull();
    expect(
      screen.queryByRole('combobox', { name: 'Rows per page' })
    ).toBeNull();
  });

  it('keeps both pagers on an empty later page so you can step back', () => {
    const { onPageChange } = renderSection({
      number: 2,
      size: 10,
      totalPages: 0,
      totalElements: 0,
    });
    expect(pagers()).toHaveLength(2);
    fireEvent.click(
      within(pagers()[1].nav).getByRole('button', { name: 'Previous page' })
    );
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
