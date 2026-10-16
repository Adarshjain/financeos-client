import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Pager } from './Pager';

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
    expect(container.querySelector('.lg\\:inline')).toBeNull();
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

  it('handles 0 totalElements', () => {
    render(
      <Pager
        page={0}
        size={50}
        totalElements={0}
        totalPages={1}
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

  it('renders each page number exactly once in the DOM with desktop neighbours carrying hidden lg:inline-flex', () => {
    render(
      <Pager
        page={2} // page 3 of 4
        size={50}
        totalElements={182}
        totalPages={4}
        onPageChange={() => {}}
      />,
    );

    [1, 2, 3, 4].forEach((num) => {
      expect(screen.getAllByRole('button', { name: `Page ${num}` })).toHaveLength(1);
    });

    // Page 2 is a neighbour on page 3 of 4, so it carries hidden lg:inline-flex
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveClass('hidden', 'lg:inline-flex');
    // Active page does not carry hidden
    expect(screen.getByRole('button', { name: 'Page 3' })).not.toHaveClass('hidden');
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

  it('hides arrows and page buttons for single page lists', () => {
    render(
      <Pager
        page={0}
        size={50}
        totalElements={25}
        totalPages={1}
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
    expect(screen.getByText('transactions')).toHaveClass('hidden', 'lg:inline');
  });
});
