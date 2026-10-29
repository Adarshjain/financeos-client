import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Pager } from './Pager';

describe('Pager hide-when-fits', () => {
  it('hides when everything fits on the first page', () => {
    const { container } = render(<Pager page={0} size={50} totalElements={10} onPageChange={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('stays visible on page 2+ after the total shrank, so the user can page back', () => {
    render(<Pager page={2} size={50} totalElements={10} onPageChange={() => {}} />);
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  });
});

describe('Pager', () => {
  it('renders range and total count with / by default', () => {
    render(
      <Pager
        page={0}
        size={50}
        totalElements={182}
        totalPages={4}
        unit="transactions"
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByText('1–50')).toBeInTheDocument();
    expect(screen.getByText('/ 182')).toBeInTheDocument();
    expect(screen.getByText('transactions')).toBeInTheDocument();
  });

  it('does not render unit when not provided', () => {
    const { container } = render(
      <Pager
        page={0}
        size={50}
        totalElements={182}
        totalPages={4}
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByText('1–50')).toBeInTheDocument();
    expect(screen.getByText('/ 182')).toBeInTheDocument();
    expect(container.querySelector('.desk\\:inline')).toBeNull();
  });

  it('renders custom summary when supplied', () => {
    render(
      <Pager
        page={0}
        size={50}
        totalElements={182}
        totalPages={4}
        summary={({ start, end, total }) => `${start}–${end} of ${total} transactions`}
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByText('1–50 of 182 transactions')).toBeInTheDocument();
    expect(screen.queryByText('/ 182')).not.toBeInTheDocument();
  });

  it('handles 0 totalElements when kept with alwaysShow', () => {
    render(
      <Pager
        page={0}
        size={50}
        totalElements={0}
        totalPages={1}
        alwaysShow
        unit="transactions"
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('/ 0')).toBeInTheDocument();
  });

  it('marks active page with aria-current="page"', () => {
    render(
      <Pager
        page={1} // 0-based page 1 is "2"
        size={50}
        totalElements={182}
        totalPages={4}
        onPageChange={() => {}}
      />,
    );

    const activePageBtn = screen.getByRole('button', { name: /Page 2/i });
    expect(activePageBtn).toHaveAttribute('aria-current', 'page');
  });

  it('shows first, last, current and one neighbour each side on every screen size', () => {
    const { container } = render(
      <Pager
        page={4} // page 5 of 10
        size={50}
        totalElements={500}
        totalPages={10}
        onPageChange={() => {}}
      />,
    );

    [1, 4, 5, 6, 10].forEach((num) => {
      expect(screen.getAllByRole('button', { name: `Page ${num}` })).toHaveLength(1);
    });
    [2, 3, 7, 8, 9].forEach((num) => {
      expect(screen.queryByRole('button', { name: `Page ${num}` })).not.toBeInTheDocument();
    });

    // Phone and desktop show the same items: nothing is hidden by breakpoint
    ['Page 1', 'Page 4', 'Page 5', 'Page 6', 'Page 10'].forEach((name) => {
      expect(screen.getByRole('button', { name })).not.toHaveClass('hidden');
      expect(screen.getByRole('button', { name }).className).not.toContain('desk:inline-flex');
    });
    // One ellipsis on each side, shown on both forms
    const gaps = Array.from(container.querySelectorAll('[aria-hidden="true"]')).filter((el) => el.textContent === '…');
    expect(gaps).toHaveLength(2);
    gaps.forEach((gap) => {
      expect(gap).not.toHaveClass('hidden');
      expect(gap).not.toHaveClass('desk:hidden');
    });
  });

  it('shows the page in a one-page gap instead of hiding it or using an ellipsis', () => {
    const { container } = render(
      <Pager page={0} size={10} totalElements={30} onPageChange={() => {}} />,
    );

    // Page 1 of 3 on phone: 1 2 3, never "1 3"
    ['Page 1', 'Page 2', 'Page 3'].forEach((name) => {
      expect(screen.getByRole('button', { name })).not.toHaveClass('hidden');
    });
    expect(container.textContent).not.toContain('…');
  });

  it('shows the same pages on phone and desktop with one ellipsis for a long gap', () => {
    const { container } = render(
      <Pager page={3} size={10} totalElements={100} onPageChange={() => {}} />,
    );

    // Page 4 of 10: 1 2 3 4 5 … 10
    [1, 2, 3, 4, 5, 10].forEach((num) => {
      expect(screen.getByRole('button', { name: `Page ${num}` }).className).not.toMatch(/hidden/);
    });
    const gaps = Array.from(container.querySelectorAll('[aria-hidden="true"]')).filter((el) => el.textContent === '…');
    expect(gaps).toHaveLength(1);
    expect(gaps[0].className).not.toMatch(/hidden/);
  });

  it('compact variant trims the padding and uses small controls', () => {
    render(
      <Pager variant="compact" page={0} size={10} totalElements={30} onPageChange={() => {}} />,
    );

    expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveClass('py-space-4', 'text-label');
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveClass('h-control-sm', 'min-w-control-sm');
    expect(screen.getByRole('button', { name: 'Next page' })).toHaveClass('h-control-sm');
  });

  it('disables previous button on first page', () => {
    render(
      <Pager
        page={0}
        size={50}
        totalElements={182}
        totalPages={4}
        onPageChange={() => {}}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Previous page' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Next page' }),
    ).not.toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(
      <Pager
        page={3}
        size={50}
        totalElements={182}
        totalPages={4}
        onPageChange={() => {}}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Previous page' }),
    ).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('triggers onPageChange when clicking page numbers and arrows', () => {
    const handlePageChange = vi.fn();
    render(
      <Pager
        page={0}
        size={50}
        totalElements={182}
        totalPages={4}
        onPageChange={handlePageChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(handlePageChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole('button', { name: /Page 4/i }));
    expect(handlePageChange).toHaveBeenCalledWith(3);
  });

  it('triggers onSizeChange when changing page size via Select and formats with sizeLabel', () => {
    const handleSizeChange = vi.fn();
    render(
      <Pager
        page={0}
        size={50}
        totalElements={182}
        totalPages={4}
        onPageChange={() => {}}
        onSizeChange={handleSizeChange}
        sizeOptions={[25, 50, 100]}
        sizeLabel={(n) => `${n} / page`}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Rows per page' });
    expect(trigger).toHaveTextContent('50 / page');
    fireEvent.click(trigger);

    const option = screen.getByRole('option', { name: '100 / page' });
    fireEvent.click(option);
    expect(handleSizeChange).toHaveBeenCalledWith(100);
  });

  it('renders nothing when everything fits one page', () => {
    const { container } = render(
      <Pager page={0} size={25} totalElements={25} onSizeChange={() => {}} onPageChange={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps the size select when one page is not the smallest page size', () => {
    render(<Pager page={0} size={100} totalElements={40} onSizeChange={() => {}} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Rows per page' })).toHaveTextContent('100 / page');
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  });

  it('has no bare page-size box without onSizeChange', () => {
    render(<Pager page={0} size={25} totalElements={80} onPageChange={() => {}} />);
    expect(screen.queryByText('25 / page')).not.toBeInTheDocument();
  });

  it('hides arrows and page buttons for single page lists when kept', () => {
    render(
      <Pager
        page={0}
        size={50}
        totalElements={25}
        totalPages={1}
        alwaysShow
        unit="needing review"
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByText('1–25')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Previous page' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Next page' }),
    ).not.toBeInTheDocument();
  });

  it('applies responsive hidden classes to unit on mobile viewports', () => {
    render(
      <Pager
        page={0}
        size={50}
        totalElements={182}
        totalPages={4}
        unit="transactions"
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByText('1–50')).toBeInTheDocument();
    expect(screen.getByText('/ 182')).toBeInTheDocument();
    expect(screen.getByText('transactions')).toHaveClass('hidden', 'desk:inline');
  });
});
