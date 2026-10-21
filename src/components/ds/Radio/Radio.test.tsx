import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Radio } from './Radio';

describe('Radio', () => {
  it('checks on click and fires onCheckedChange(true)', () => {
    const onCheckedChange = vi.fn();
    render(<Radio aria-label="Pay in full" onCheckedChange={onCheckedChange} />);
    const radio = screen.getByRole('radio', { name: 'Pay in full' });
    expect(radio).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(radio);
    expect(radio).toHaveAttribute('aria-checked', 'true');
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('does nothing when clicked while checked', () => {
    const onCheckedChange = vi.fn();
    render(<Radio aria-label="Pay in full" defaultChecked onCheckedChange={onCheckedChange} />);
    const radio = screen.getByRole('radio');
    fireEvent.click(radio);
    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(radio).toHaveAttribute('aria-checked', 'true');
  });

  it('controlled: stays as the prop says until the page changes it', () => {
    const onCheckedChange = vi.fn();
    render(<Radio aria-label="A" checked={false} onCheckedChange={onCheckedChange} />);
    const radio = screen.getByRole('radio');
    fireEvent.click(radio);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(radio).toHaveAttribute('aria-checked', 'false');
  });

  it('controlled: follows the page state', () => {
    function Harness() {
      const [on, setOn] = useState(false);
      return <Radio aria-label="A" checked={on} onCheckedChange={setOn} />;
    }
    render(<Harness />);
    const radio = screen.getByRole('radio');
    fireEvent.click(radio);
    expect(radio).toHaveAttribute('aria-checked', 'true');
  });

  it('disabled does nothing', () => {
    const onCheckedChange = vi.fn();
    render(<Radio aria-label="A" disabled onCheckedChange={onCheckedChange} />);
    const radio = screen.getByRole('radio');
    fireEvent.click(radio);
    expect(radio).toBeDisabled();
    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(radio).toHaveAttribute('aria-checked', 'false');
  });

  it('passes name and value through', () => {
    render(<Radio aria-label="A" name="plan" value="full" />);
    const radio = screen.getByRole('radio');
    expect(radio).toHaveAttribute('name', 'plan');
    expect(radio).toHaveAttribute('value', 'full');
  });
});
