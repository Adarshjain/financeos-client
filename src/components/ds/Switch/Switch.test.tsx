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
});

describe('Switch with label and description', () => {
  it('renders label and description connected to switch', () => {
    render(
      <Switch
        label="Exclude from net worth"
        description="Hide this account from totals"
      />,
    );
    const label = screen.getByText('Exclude from net worth');
    const description = screen.getByText('Hide this account from totals');
    const switchEl = screen.getByRole('switch');

    expect(label).toHaveAttribute('for', switchEl.getAttribute('id'));
    expect(switchEl).toHaveAttribute('aria-describedby', description.getAttribute('id'));
  });

  it('renders error message and links it with aria-describedby', () => {
    render(
      <Switch
        label="Enable alerts"
        error="You must verify email first"
      />,
    );
    const error = screen.getByText('You must verify email first');
    const switchEl = screen.getByRole('switch');

    expect(switchEl).toHaveAttribute('aria-describedby', error.getAttribute('id'));
  });
});
