import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReadOnlyRow, TextField } from './TextField';

describe('TextField component', () => {
  it('renders label and input with default value', () => {
    render(<TextField label="Account name" defaultValue="HDFC Regalia" />);
    expect(screen.getByLabelText('Account name')).toHaveValue('HDFC Regalia');
  });

  it('renders (Optional) text when optional prop is true', () => {
    render(<TextField label="Description" optional />);
    expect(screen.getByText('(Optional)')).toBeInTheDocument();
  });

  it('handles user typing via onChange', () => {
    const handleChange = vi.fn();
    render(<TextField label="Pattern" onChange={handleChange} />);
    const input = screen.getByLabelText('Pattern');
    fireEvent.change(input, { target: { value: 'SWIGGY' } });
    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue('SWIGGY');
  });

  it('renders helper text when provided', () => {
    render(<TextField label="Field" helper="Helpful hint" />);
    expect(screen.getByText('Helpful hint')).toBeInTheDocument();
  });

  it('renders error message and applies danger border', () => {
    const { container } = render(
      <TextField label="Last 4 digits" error="Enter 4 digits" />,
    );
    expect(screen.getByText('Enter 4 digits')).toBeInTheDocument();
    expect(screen.getByText('Enter 4 digits')).toHaveClass('text-danger');
    const inputWrapper = container.querySelector('.border-danger');
    expect(inputWrapper).toBeInTheDocument();
  });

  it('renders locked state with lock icon and disabled input', () => {
    const { container } = render(
      <TextField label="Account" defaultValue="HDFC" locked />,
    );
    const input = screen.getByLabelText('Account');
    expect(input).toBeDisabled();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('toggles password visibility with Show/Hide button', () => {
    render(<TextField label="Password" type="password" defaultValue="secret" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: 'Show password' });
    fireEvent.click(toggleButton);

    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
  });

  it('renders prefix and suffix elements', () => {
    render(
      <TextField
        label="Amount"
        prefix="₹"
        suffix={<span data-testid="test-suffix">INR</span>}
      />,
    );
    expect(screen.getByText('₹')).toBeInTheDocument();
    expect(screen.getByTestId('test-suffix')).toBeInTheDocument();
  });

  it('renders multiline textarea when multiline is true', () => {
    render(<TextField label="Notes" multiline rows={4} placeholder="Add note" />);
    const textarea = screen.getByPlaceholderText('Add note');
    expect(textarea.tagName.toLowerCase()).toBe('textarea');
    expect(textarea).toHaveAttribute('rows', '4');
  });

  it('renders ReadOnlyRow with label and value', () => {
    render(<ReadOnlyRow label="Source" value="Statement PDF" />);
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('Statement PDF')).toBeInTheDocument();
  });
});
