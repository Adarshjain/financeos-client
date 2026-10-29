import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoadError } from './LoadError';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

beforeEach(() => refresh.mockClear());

describe('LoadError', () => {
  it('says what failed and offers Retry', () => {
    render(<LoadError what="loans" />);
    expect(screen.getByText("Couldn't load loans")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByText(/quote the reference/)).toBeNull();
  });

  it('quotes the reference and offers to copy it when there is one', () => {
    render(<LoadError what="accounts" reference="req-123" />);
    expect(screen.getByText(/quote the reference/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy reference req-123' })).toBeInTheDocument();
  });

  it('Retry refreshes the route by default', () => {
    render(<LoadError what="reports" />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('Retry calls retry instead when given', () => {
    const retry = vi.fn();
    render(<LoadError what="reports" retry={retry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });
});
