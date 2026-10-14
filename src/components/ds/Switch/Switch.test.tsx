import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Switch, ToggleRow } from './Switch';

describe('Switch', () => {
  it('renders with role switch and default checked false', () => {
    render(<Switch />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toBeInTheDocument();
    expect(switchEl).toHaveAttribute('aria-checked', 'false');
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

  it('toggles on Space and Enter keyboard events', () => {
    const handleCheckedChange = vi.fn();
    render(<Switch onCheckedChange={handleCheckedChange} />);
    const switchEl = screen.getByRole('switch');

    fireEvent.keyDown(switchEl, { key: ' ' });
    expect(switchEl).toHaveAttribute('aria-checked', 'true');

    fireEvent.keyDown(switchEl, { key: 'Enter' });
    expect(switchEl).toHaveAttribute('aria-checked', 'false');
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

describe('ToggleRow', () => {
  it('renders label and description connected to switch', () => {
    render(
      <ToggleRow
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
      <ToggleRow
        label="Enable alerts"
        error="You must verify email first"
      />,
    );
    const error = screen.getByText('You must verify email first');
    const switchEl = screen.getByRole('switch');

    expect(switchEl).toHaveAttribute('aria-describedby', error.getAttribute('id'));
  });
});
