import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TextArea } from './TextArea';

describe('TextArea component', () => {
  it('renders label and textarea with default rows=3', () => {
    render(<TextArea label="Note" defaultValue="Split with Priya" />);
    const textarea = screen.getByLabelText('Note');
    expect(textarea).toHaveValue('Split with Priya');
    expect(textarea).toHaveAttribute('rows', '3');
  });

  it('renders (Optional) text when optional prop is true', () => {
    render(<TextArea label="Description" optional />);
    expect(screen.getByText('(Optional)')).toBeInTheDocument();
  });

  it('handles user typing via onChange', () => {
    const handleChange = vi.fn();
    render(<TextArea label="Note" onChange={handleChange} />);
    const textarea = screen.getByLabelText('Note');
    fireEvent.change(textarea, { target: { value: 'New note content' } });
    expect(handleChange).toHaveBeenCalled();
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
});
