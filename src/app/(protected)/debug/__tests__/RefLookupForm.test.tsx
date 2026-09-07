import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { RefLookupForm } from '@/app/(protected)/debug/RefLookupForm';

describe('RefLookupForm', () => {
  it('pre-fills initialRef and initialType and disables submit when empty or loading', () => {
    const onSearch = vi.fn();

    const { rerender } = render(
      <RefLookupForm
        initialRef="initial-ref-1"
        initialType="errorId"
        onSearch={onSearch}
        isLoading={false}
      />,
    );

    const input = screen.getByPlaceholderText(/Enter requestId or errorId/) as HTMLInputElement;
    expect(input.value).toBe('initial-ref-1');
    expect(screen.getByRole('button', { name: /Look up/i })).not.toBeDisabled();

    // Disabled when empty
    fireEvent.change(input, { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: /Look up/i })).toBeDisabled();

    // Disabled when isLoading
    rerender(
      <RefLookupForm
        initialRef="initial-ref-1"
        initialType="errorId"
        onSearch={onSearch}
        isLoading={true}
      />,
    );
    expect(screen.getByRole('button', { name: /Look up/i })).toBeDisabled();
  });

  it('submits trimmed ref and selected type', () => {
    const onSearch = vi.fn();

    render(
      <RefLookupForm
        initialRef="  E2EERR01  "
        initialType="errorId"
        onSearch={onSearch}
        isLoading={false}
      />,
    );

    const submitBtn = screen.getByRole('button', { name: /Look up/i });
    fireEvent.click(submitBtn);

    expect(onSearch).toHaveBeenCalledWith('E2EERR01', 'errorId');
  });
});
