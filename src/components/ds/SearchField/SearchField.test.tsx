import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SearchField } from './SearchField';

describe('SearchField', () => {
  it('renders with placeholder and search icon', () => {
    render(<SearchField placeholder="Search transactions…" />);
    const input = screen.getByPlaceholderText('Search transactions…');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'search');
  });

  it('renders label and connects it to input', () => {
    render(<SearchField label="Find the other side" />);
    const label = screen.getByText('Find the other side');
    const input = screen.getByRole('searchbox');
    expect(label).toHaveAttribute('for', input.getAttribute('id'));
  });

  it('renders helper message with aria-describedby', () => {
    render(
      <SearchField
        defaultValue="xyz"
        helper='No transactions match "xyz".'
      />,
    );
    const helper = screen.getByText('No transactions match "xyz".');
    const input = screen.getByRole('searchbox');
    expect(helper).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-describedby', helper.getAttribute('id'));
  });

  it('shows clear button when there is text and clears on click', () => {
    const handleClear = vi.fn();
    const handleValueChange = vi.fn();

    render(
      <SearchField
        defaultValue="swiggy"
        onClear={handleClear}
        onValueChange={handleValueChange}
      />,
    );

    const input = screen.getByRole('searchbox') as HTMLInputElement;
    expect(input.value).toBe('swiggy');

    const clearButton = screen.getByRole('button', { name: /clear search/i });
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);
    expect(handleClear).toHaveBeenCalledTimes(1);
    expect(handleValueChange).toHaveBeenCalledTimes(1);
    expect(handleValueChange).toHaveBeenCalledWith('');
    expect(input.value).toBe('');
  });

  it('forwards callback ref and refocuses on clear', () => {
    let inputRef: HTMLInputElement | null = null;
    render(
      <SearchField
        defaultValue="query"
        ref={(el) => {
          inputRef = el;
        }}
      />,
    );
    expect(inputRef).not.toBeNull();
    const clearButton = screen.getByRole('button', { name: /clear search/i });
    fireEvent.click(clearButton);
    expect(document.activeElement).toBe(inputRef);
  });

  it('works in controlled mode', () => {
    const ControlledComponent = () => {
      const [val, setVal] = useState('initial');
      return (
        <SearchField
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onValueChange={setVal}
        />
      );
    };

    render(<ControlledComponent />);
    const input = screen.getByRole('searchbox') as HTMLInputElement;
    expect(input.value).toBe('initial');

    fireEvent.change(input, { target: { value: 'updated' } });
    expect(input.value).toBe('updated');

    const clearBtn = screen.getByRole('button', { name: /clear search/i });
    fireEvent.click(clearBtn);
    expect(input.value).toBe('');
  });

  it('applies size="md" height class (h-control-md) by default', () => {
    const { container } = render(
      <SearchField placeholder="In filter" />,
    );
    const wrapper = container.querySelector('.h-control-md');
    expect(wrapper).toBeInTheDocument();
  });

  it('applies size="lg" height class', () => {
    const { container } = render(
      <SearchField size="lg" placeholder="In sheet" />,
    );
    const wrapper = container.querySelector('.h-control-lg');
    expect(wrapper).toBeInTheDocument();
  });

  it('applies variant="embedded" classes without focus ring', () => {
    const { container } = render(<SearchField variant="embedded" />);
    const box = container.querySelector('.focus-within\\:ring-0');
    expect(box).toBeInTheDocument();
  });

  it('applies controlClassName to the input element', () => {
    render(<SearchField controlClassName="font-mono" />);
    expect(screen.getByRole('searchbox')).toHaveClass('font-mono');
  });

  it('does not show clear button when disabled', () => {
    render(<SearchField defaultValue="disabled search" disabled />);
    expect(
      screen.queryByRole('button', { name: /clear search/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeDisabled();
  });
});
