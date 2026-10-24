import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { DateField } from './DateField/DateField';
import { TextArea } from './TextArea/TextArea';
import { TextField } from './TextField/TextField';

describe('field labels are plain text, not tap targets', () => {
  it('TextField: tapping the label does not focus the input; getByLabelText finds it', () => {
    render(<TextField label="Merchant" />);
    const input = screen.getByLabelText('Merchant');
    fireEvent.click(screen.getByText('Merchant'));
    expect(document.querySelector('label')).toBeNull();
    expect(input).not.toHaveFocus();
    expect(input.tagName).toBe('INPUT');
  });

  it('TextField with the optional marker is still found by its label', () => {
    render(<TextField label="Note" optional />);
    expect(screen.getByLabelText(/Note/)).toBeInTheDocument();
  });

  it('TextArea: tapping the label does not focus it; getByLabelText finds it', () => {
    render(<TextArea label="Notes" />);
    const area = screen.getByLabelText('Notes');
    fireEvent.click(screen.getByText('Notes'));
    expect(area).not.toHaveFocus();
    expect(area.tagName).toBe('TEXTAREA');
  });

  it('DateField: tapping the label does not focus the input; getByLabelText finds it', () => {
    render(<DateField today="2026-10-13" label="Paid on" />);
    const input = screen.getByLabelText('Paid on');
    fireEvent.click(screen.getByText('Paid on'));
    expect(input).not.toHaveFocus();
    expect(input.tagName).toBe('INPUT');
  });

  it('a field without a label has no aria-labelledby', () => {
    render(<TextField aria-label="Search" />);
    expect(screen.getByLabelText('Search')).not.toHaveAttribute('aria-labelledby');
  });
});

describe('disabled fields', () => {
  it('TextField disabled wins over error and focus styling', () => {
    const { container } = render(<TextField label="A" disabled error="Bad" />);
    const frame = container.querySelector('.border') as HTMLElement;
    expect(frame).toHaveClass('bg-sunken', 'border-line', 'opacity-60');
    expect(frame.className).not.toMatch(/focus-within:|border-danger/);
  });

  it('DateField disabled looks like a disabled TextField and its calendar button is disabled', () => {
    const { container } = render(<DateField today="2026-10-13" label="Paid on" disabled />);
    const frame = container.querySelector('.border') as HTMLElement;
    expect(frame).toHaveClass('bg-sunken', 'text-ink-faint', 'border-line', 'cursor-not-allowed', 'opacity-60');
    expect(screen.getByRole('button', { name: 'Open calendar' })).toBeDisabled();
  });

  it('TextArea disabled drops focus and error styling', () => {
    render(<TextArea label="N" disabled error="Bad" />);
    const area = screen.getByLabelText('N');
    expect(area).toHaveClass('bg-sunken', 'border-line', 'opacity-60');
    expect(area.className).not.toMatch(/focus:ring|border-danger/);
  });
});
