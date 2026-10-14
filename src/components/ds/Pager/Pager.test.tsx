import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Pager } from './Pager';

describe('Pager', () => {
  it('renders range and total count with pluralized unit', () => {
    render(
      <Pager
        page={0}
        size={50}
        totalElements={182}
        totalPages={4}
        unit="transaction"
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByText('1–50')).toBeInTheDocument();
    expect(screen.getByText('of 182')).toBeInTheDocument();
    expect(screen.getByText('transactions')).toBeInTheDocument();
  });

  it('handles 0 totalElements', () => {
    render(
      <Pager
        page={0}
        size={50}
        totalElements={0}
        totalPages={1}
        unit="transaction"
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('of 0')).toBeInTheDocument();
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

    const activePageBtn = screen.getByRole('button', { name: '2' });
    expect(activePageBtn).toHaveAttribute('aria-current', 'page');
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

    fireEvent.click(screen.getByRole('button', { name: '4' }));
    expect(handlePageChange).toHaveBeenCalledWith(3);
  });

  it('triggers onSizeChange when changing page size', () => {
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
      />,
    );

    const select = screen.getByRole('combobox', { name: 'Rows per page' });
    fireEvent.change(select, { target: { value: '100' } });
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

  it('hides unit in phone variant', () => {
    render(
      <Pager
        variant="phone"
        page={0}
        size={50}
        totalElements={182}
        totalPages={4}
        unit="transaction"
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByText('1–50')).toBeInTheDocument();
    expect(screen.getByText('of 182')).toBeInTheDocument();
    expect(screen.queryByText('transactions')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: 'Rows per page' }),
    ).not.toBeInTheDocument();
  });
});
