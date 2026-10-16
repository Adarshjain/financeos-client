import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Switch } from './Switch';

describe('Switch', () => {
  it('renders with role switch and default checked false', () => {
    render(<Switch />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toBeInTheDocument();
    expect(switchEl).toHaveAttribute('aria-checked', 'false');
    expect(switchEl).toHaveAttribute('aria-label', 'Toggle');
  });

  it('renders with token sizes (w-control-lg h-space-20)', () => {
    render(<Switch />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveClass('w-control-lg');
    expect(switchEl).toHaveClass('h-space-20');
  });

  it('renders default checked true', () => {
    render(<Switch defaultChecked />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles when clicked in uncontrolled mode', () => {
    const handleCheckedChange = vi.fn();
    render(<Switch onCheckedChange={handleCheckedChange} />);
    const switchEl = screen.getByRole('switch');

    fireEvent.click(switchEl);
    expect(switchEl).toHaveAttribute('aria-checked', 'true');
    expect(handleCheckedChange).toHaveBeenCalledWith(true);

    fireEvent.click(switchEl);
    expect(switchEl).toHaveAttribute('aria-checked', 'false');
    expect(handleCheckedChange).toHaveBeenCalledWith(false);
  });

  it('works in controlled mode', () => {
    const ControlledComponent = () => {
      const [checked, setChecked] = useState(false);
      return (
        <Switch
          checked={checked}
          onCheckedChange={setChecked}
        />
      );
    };

    render(<ControlledComponent />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(switchEl);
    expect(switchEl).toHaveAttribute('aria-checked', 'true');
  });

  it('is a button of type button', () => {
    render(<Switch />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl.tagName.toLowerCase()).toBe('button');
    expect(switchEl).toHaveAttribute('type', 'button');
  });

  it('does not toggle when disabled', () => {
    const handleCheckedChange = vi.fn();
    render(<Switch disabled onCheckedChange={handleCheckedChange} />);
    const switchEl = screen.getByRole('switch');

    fireEvent.click(switchEl);
    expect(switchEl).toHaveAttribute('aria-checked', 'false');
    expect(handleCheckedChange).not.toHaveBeenCalled();
  });

  it('calls consumer onClick and still toggles', () => {
    const handleClick = vi.fn();
    const handleCheckedChange = vi.fn();
    render(<Switch onClick={handleClick} onCheckedChange={handleCheckedChange} />);
    const switchEl = screen.getByRole('switch');

    fireEvent.click(switchEl);
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleCheckedChange).toHaveBeenCalledWith(true);
    expect(switchEl).toHaveAttribute('aria-checked', 'true');
  });

  it('does not toggle if consumer onClick prevents default', () => {
    const handleClick = vi.fn((e: React.MouseEvent) => e.preventDefault());
    const handleCheckedChange = vi.fn();
    render(<Switch onClick={handleClick} onCheckedChange={handleCheckedChange} />);
    const switchEl = screen.getByRole('switch');

    fireEvent.click(switchEl);
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleCheckedChange).not.toHaveBeenCalled();
    expect(switchEl).toHaveAttribute('aria-checked', 'false');
  });

  it('renders hidden input when name is provided for form submission', () => {
    const { container } = render(<Switch name="notifications" value="yes" defaultChecked />);
    const input = container.querySelector('input[type="checkbox"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('name', 'notifications');
    expect(input).toHaveAttribute('value', 'yes');
    expect(input).toBeChecked();
  });

  it('merges custom className directly onto button', () => {
    render(<Switch className="custom-switch" />);
    expect(screen.getByRole('switch')).toHaveClass('custom-switch');
  });
});
