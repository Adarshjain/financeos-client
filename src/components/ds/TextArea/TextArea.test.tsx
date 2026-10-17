import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TextArea } from './TextArea';

describe('TextArea component', () => {
  it('renders label and textarea with default rows=1, min-h-control-lg, and resize-y', () => {
    render(<TextArea label="Note" defaultValue="Split with Priya" />);
    const textarea = screen.getByLabelText('Note');
    expect(textarea).toHaveValue('Split with Priya');
    expect(textarea).toHaveAttribute('rows', '1');
    expect(textarea).toHaveClass('min-h-control-lg');
    expect(textarea).toHaveClass('resize-y');
  });

  it('adjusts height to auto-grow with content up to maxRows lines when specified', () => {
    const { container } = render(
      <TextArea label="Note" defaultValue="" maxRows={8} />,
    );
    const textarea = container.querySelector('textarea')!;
    expect(textarea.style.height).toBe('36px'); // starts at 36px (h-control-lg)

    // Simulate content growth
    Object.defineProperty(textarea, 'scrollHeight', {
      configurable: true,
      value: 72,
    });
    fireEvent.change(textarea, { target: { value: 'Line 1\nLine 2\nLine 3' } });
    expect(textarea.style.height).toBe('72px');

    // Simulate growth beyond 8 lines (e.g. 200px > 162px max)
    Object.defineProperty(textarea, 'scrollHeight', {
      configurable: true,
      value: 200,
    });
    fireEvent.change(textarea, { target: { value: 'Many lines\n'.repeat(10) } });
    expect(textarea.style.height).toBe('162px');
    expect(textarea.style.overflowY).toBe('auto');
  });

  it('grows indefinitely with 20 lines of text when maxRows is omitted, with no internal scroll', () => {
    const { container } = render(<TextArea label="Note" defaultValue="" />);
    const textarea = container.querySelector('textarea')!;
    expect(textarea.style.height).toBe('36px');

    // Simulate 20 lines of text height (378px)
    Object.defineProperty(textarea, 'scrollHeight', {
      configurable: true,
      value: 378,
    });
    fireEvent.change(textarea, { target: { value: 'Line\n'.repeat(20) } });
    expect(textarea.style.height).toBe('378px');
    expect(textarea.style.overflowY).toBe('hidden');
  });

  it('renders (Optional) text when optional prop is true', () => {
    render(<TextArea label="Description" optional />);
    expect(screen.getByText('(Optional)')).toBeInTheDocument();
  });

  it('handles user typing via onChange and onValueChange', () => {
    const handleChange = vi.fn();
    const handleValueChange = vi.fn();
    render(
      <TextArea
        label="Note"
        onChange={handleChange}
        onValueChange={handleValueChange}
      />,
    );
    const textarea = screen.getByLabelText('Note');
    fireEvent.change(textarea, { target: { value: 'New note content' } });
    expect(handleChange).toHaveBeenCalled();
    expect(handleValueChange).toHaveBeenCalledWith('New note content');
    expect(textarea).toHaveValue('New note content');
  });

  it('renders helper text when provided', () => {
    render(<TextArea label="Note" helper="Visible on exports" />);
    expect(screen.getByText('Visible on exports')).toBeInTheDocument();
  });

  it('renders error message and applies danger border', () => {
    const { container } = render(
      <TextArea label="Note" error="Max length exceeded" />,
    );
    expect(screen.getByText('Max length exceeded')).toBeInTheDocument();
    expect(screen.getByText('Max length exceeded')).toHaveClass('text-danger');
    const textarea = container.querySelector('textarea');
    expect(textarea).toHaveClass('border-danger');
  });

  it('renders disabled state', () => {
    render(<TextArea label="Note" defaultValue="Fixed note" disabled />);
    const textarea = screen.getByLabelText('Note');
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveClass('cursor-not-allowed');
  });

  it('applies controlClassName to the textarea element', () => {
    render(<TextArea label="Code" controlClassName="font-mono text-xs" />);
    expect(screen.getByLabelText('Code')).toHaveClass('font-mono', 'text-xs');
  });
});
