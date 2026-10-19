import { act, fireEvent, render, screen } from '@testing-library/react';
import React, { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('is closed by default and shows the label on focus', async () => {
    render(
      <Tooltip content="Edit account">
        <button type="button">Edit</button>
      </Tooltip>,
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    await act(async () => {
      screen.getByRole('button', { name: 'Edit' }).focus();
    });
    expect(screen.getAllByText('Edit account').length).toBeGreaterThan(0);
  });

  it('opens uncontrolled with defaultOpen and closes on Escape', async () => {
    render(
      <Tooltip content="Edit account" defaultOpen>
        <button type="button">Edit</button>
      </Tooltip>,
    );
    expect(screen.getAllByText('Edit account').length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.keyDown(document.body, { key: 'Escape' });
    });
    expect(screen.queryByText('Edit account')).not.toBeInTheDocument();
  });

  it('supports controlled open and reports changes', async () => {
    const onOpenChange = vi.fn();
    const Controlled = () => {
      const [open, setOpen] = useState(true);
      return (
        <Tooltip
          content="Edit account"
          open={open}
          onOpenChange={(o) => {
            onOpenChange(o);
            setOpen(o);
          }}
        >
          <button type="button">Edit</button>
        </Tooltip>
      );
    };
    render(<Controlled />);
    expect(screen.getAllByText('Edit account').length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.keyDown(document.body, { key: 'Escape' });
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByText('Edit account')).not.toBeInTheDocument();
  });

  it('is hidden in the phone layout with CSS and uses the ink surface tokens', () => {
    render(
      <Tooltip content="Edit account" defaultOpen>
        <button type="button">Edit</button>
      </Tooltip>,
    );
    const content = document.querySelector('[data-side]') as HTMLElement;
    expect(content).toHaveClass('max-desk:hidden');
    expect(content).toHaveClass('bg-brand');
    expect(content).toHaveClass('text-on-brand');
    expect(content).toHaveClass('text-caption');
    expect(content).toHaveClass('rounded-ds-sm');
  });

  it('forwards its ref to the trigger and keeps the child element', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Tooltip content="Edit account" ref={ref}>
        <button type="button">Edit</button>
      </Tooltip>,
    );
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Edit' }));
  });
});
