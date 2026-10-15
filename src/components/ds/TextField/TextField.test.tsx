import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TextField } from './TextField';

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

  it('renders disabled state', () => {
    render(<TextField label="Account" defaultValue="HDFC" disabled />);
    const input = screen.getByLabelText('Account');
    expect(input).toBeDisabled();
  });

  it('renders kind="amount" with ₹ prefix and tabular-nums', () => {
    render(<TextField label="Total due" kind="amount" defaultValue="44,319.00" />);
    expect(screen.getByText('₹')).toBeInTheDocument();
    const input = screen.getByLabelText('Total due');
    expect(input).toHaveClass('tabular-nums');
    expect(input).toHaveValue('44,319.00');
  });

  it('toggles password visibility with Show/Hide button', () => {
    render(
      <TextField
        label="Password"
        kind="password"
        defaultValue="secret"
      />,
    );
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: 'Show password' });
    fireEvent.click(toggleButton);

    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
  });

  it('renders custom prefix and suffix elements', () => {
    render(
      <TextField
        label="Amount"
        prefix="$"
        suffix={<span data-testid="test-suffix">USD</span>}
      />,
    );
    expect(screen.getByText('$')).toBeInTheDocument();
    expect(screen.getByTestId('test-suffix')).toBeInTheDocument();
  });
});
