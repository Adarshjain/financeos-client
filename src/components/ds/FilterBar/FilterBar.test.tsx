import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FilterChip } from '../FilterChip/FilterChip';
import { FilterBar } from './FilterBar';

const search = (value = '', onValueChange: (v: string) => void = () => {}) => ({ value, onValueChange });

describe('FilterBar', () => {
  it('puts the search field first, then the chips, in one scrolling row', () => {
    const { container } = render(
      <FilterBar search={search()}>
        <FilterChip>All</FilterChip>
        <FilterChip>Cards</FilterChip>
      </FilterBar>,
    );
    const row = container.firstElementChild as HTMLElement;
    expect(row).toHaveClass('flex', 'overflow-x-auto');
    expect(row.children).toHaveLength(3);
    expect(row.children[0].querySelector('input')).toBeInTheDocument();
    expect(row.children[1]).toHaveTextContent('All');
  });

  it('shows just "Search" as the placeholder by default and takes an override', () => {
    const { rerender } = render(<FilterBar search={search()} />);
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    rerender(<FilterBar search={{ ...search(), placeholder: 'Symbol or name' }} />);
    expect(screen.getByPlaceholderText('Symbol or name')).toBeInTheDocument();
  });

  it('rests narrow, expands on focus and shrinks on blur when empty', () => {
    render(<FilterBar search={search()} />);
    const input = screen.getByPlaceholderText('Search');
    const box = input.closest('div.shrink-0') as HTMLElement;
    expect(box).toHaveClass('w-space-96', 'desk:w-container-xs', 'duration-base');
    fireEvent.focus(input);
    expect(box).toHaveClass('w-screen', 'max-w-container-viewport-inset');
    expect(box).not.toHaveClass('w-space-96');
    fireEvent.blur(input);
    expect(box).toHaveClass('w-space-96');
  });

  it('stays expanded after blur while it holds text', () => {
    render(<FilterBar search={search('hdfc')} />);
    const input = screen.getByPlaceholderText('Search');
    const box = input.closest('div.shrink-0') as HTMLElement;
    expect(box).toHaveClass('w-screen', 'max-w-container-viewport-inset');
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(box).toHaveClass('w-screen', 'max-w-container-viewport-inset');
  });

  it('reports typed text through onValueChange', () => {
    const onValueChange = vi.fn();
    render(<FilterBar search={search('', onValueChange)} />);
    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'a' } });
    expect(onValueChange).toHaveBeenCalledWith('a');
  });

  it('renders only the chips when there is no search', () => {
    const { container } = render(
      <FilterBar>
        <FilterChip>All</FilterChip>
      </FilterBar>,
    );
    expect(container.querySelector('input')).toBeNull();
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('keeps FilterChip pill corners in the row', () => {
    render(
      <FilterBar search={search()}>
        <FilterChip>All</FilterChip>
      </FilterBar>,
    );
    expect(screen.getByText('All').closest('button')).toHaveClass('rounded-ds-pill');
  });

  it('carries its own bleed and hides its scrollbar, so pages pass no classes', () => {
    const { container } = render(<FilterBar search={search()} />);
    expect(container.firstElementChild).toHaveClass(
      'scrollbar-none',
      '-mx-space-16',
      'px-space-16',
      'py-space-4',
      '-mt-space-4',
      '-mb-space-4',
      'desk:-mx-space-4',
      'desk:px-space-4',
      'desk:-mb-space-12',
      'desk:min-w-0',
    );
  });

  it('lets a page class override part of the bleed', () => {
    const { container } = render(<FilterBar className="px-space-8" />);
    expect(container.firstElementChild).toHaveClass('px-space-8');
    expect(container.firstElementChild).not.toHaveClass('px-space-16');
  });
});
