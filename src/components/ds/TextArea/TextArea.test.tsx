import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TextArea } from './TextArea';

describe('TextArea component', () => {
  it('renders label and textarea with default rows=1, min-h-control-md, resize-y, and field-sizing: content', () => {
    render(<TextArea label="Note" defaultValue="Split with Priya" />);
    const textarea = screen.getByLabelText('Note');
    expect(textarea).toHaveValue('Split with Priya');
    expect(textarea).toHaveAttribute('rows', '1');
    expect(textarea).toHaveClass('min-h-control-md');
    expect(textarea).toHaveClass('resize-y');
    expect(textarea).toHaveClass('[field-sizing:content]');
    expect(
      (textarea.style as CSSStyleDeclaration & { fieldSizing?: string })
        .fieldSizing,
    ).toBe('content');
  });

  it('applies maxHeight constraint when maxRows is specified', () => {
    const { container } = render(
      <TextArea label="Note" defaultValue="" maxRows={8} />,
    );
    const textarea = container.querySelector('textarea')!;
    expect(textarea.style.maxHeight).toBe('calc(8lh + 18px)');
  });

  it('leaves maxHeight unconstrained when maxRows is omitted so it can grow indefinitely', () => {
    const { container } = render(<TextArea label="Note" defaultValue="" />);
    const textarea = container.querySelector('textarea')!;
    expect(textarea.style.maxHeight).toBe('');
  });

  it('applies minHeight constraint when minRows > 1 is specified', () => {
    const { container } = render(
      <TextArea label="Note" defaultValue="" minRows={4} />,
    );
    const textarea = container.querySelector('textarea')!;
    expect(textarea.style.minHeight).toBe('calc(4lh + 18px)');
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
