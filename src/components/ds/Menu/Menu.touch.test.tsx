import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Menu, MenuItem } from './Menu';

function setup(props: Partial<React.ComponentProps<typeof Menu>> = {}) {
  render(
    <Menu trigger={<button type="button">Open menu</button>} {...props}>
      <MenuItem>Edit rule</MenuItem>
    </Menu>,
  );
  return screen.getByRole('button', { name: 'Open menu' });
}

const touch = { button: 0, pointerType: 'touch' };

describe('Menu touch trigger', () => {
  it('does not open on touch pointerdown alone', () => {
    const t = setup();
    fireEvent.pointerDown(t, touch);
    expect(screen.queryByText('Edit rule')).not.toBeInTheDocument();
  });

  it('opens on touch pointerdown + click', () => {
    const t = setup();
    fireEvent.pointerDown(t, touch);
    fireEvent.click(t);
    expect(screen.getByText('Edit rule')).toBeInTheDocument();
  });

  it('stays closed when a touch scrolls (no click)', () => {
    const t = setup();
    fireEvent.pointerDown(t, touch);
    fireEvent.pointerUp(t, touch);
    expect(screen.queryByText('Edit rule')).not.toBeInTheDocument();
  });

  it('still opens on mouse pointerdown', () => {
    const t = setup();
    fireEvent.pointerDown(t, { button: 0, pointerType: 'mouse' });
    expect(screen.getByText('Edit rule')).toBeInTheDocument();
  });

  it('still opens from the keyboard', () => {
    const t = setup();
    fireEvent.keyDown(t, { key: 'Enter' });
    expect(screen.getByText('Edit rule')).toBeInTheDocument();
  });

  it('honours controlled open / onOpenChange on touch tap', () => {
    const onOpenChange = vi.fn();
    const t = setup({ open: false, onOpenChange });
    fireEvent.pointerDown(t, touch);
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(t);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByText('Edit rule')).not.toBeInTheDocument();
  });

  it('closes when the trigger is tapped while open', () => {
    const onOpenChange = vi.fn();
    const t = setup({ defaultOpen: true, onOpenChange, modal: false });
    expect(screen.getByText('Edit rule')).toBeInTheDocument();
    fireEvent.pointerDown(t, touch);
    fireEvent.click(t);
    expect(onOpenChange).not.toHaveBeenCalledWith(true);
    // jsdom: the close comes from Radix's outside dismissal (touch waits for a real click
    // sequence), which jsdom does not reproduce, so only "not reopened" is asserted here.
  });

  it('stays closed after pointercancel then a programmatic click', () => {
    const t = setup();
    fireEvent.pointerDown(t, touch);
    fireEvent.pointerCancel(t, touch);
    fireEvent.click(t);
    expect(screen.queryByText('Edit rule')).not.toBeInTheDocument();
  });

  it('stays closed for a disabled trigger on touch tap', () => {
    render(
      <Menu trigger={<button type="button" disabled>Open menu</button>}>
        <MenuItem>Edit rule</MenuItem>
      </Menu>,
    );
    const t = screen.getByRole('button', { name: 'Open menu' });
    fireEvent.pointerDown(t, touch);
    fireEvent.click(t);
    expect(screen.queryByText('Edit rule')).not.toBeInTheDocument();
  });

  it('runs the consumer onPointerDown and onClick', () => {
    const onPointerDown = vi.fn();
    const onClick = vi.fn();
    const t = setup({
      trigger: (
        <button type="button" onPointerDown={onPointerDown} onClick={onClick}>
          Open menu
        </button>
      ),
    });
    fireEvent.pointerDown(t, touch);
    fireEvent.click(t);
    // an asChild child also sees the re-dispatched open (Slot runs its handler before the trigger's)
    expect(onPointerDown).toHaveBeenCalledTimes(2);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Edit rule')).toBeInTheDocument();
  });

  it('keeps the re-dispatched open away from ancestors', () => {
    const onRowPointerDown = vi.fn();
    render(
      <div onPointerDown={onRowPointerDown}>
        <Menu trigger={<button type="button">Open menu</button>}>
          <Menu.Item>Edit rule</Menu.Item>
        </Menu>
      </div>,
    );
    const t = screen.getByRole('button', { name: 'Open menu' });
    fireEvent.pointerDown(t, touch);
    fireEvent.click(t);
    expect(onRowPointerDown).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Edit rule')).toBeInTheDocument();
  });

  it('does not open when the consumer onClick prevents default', () => {
    const t = setup({
      trigger: (
        <button type="button" onClick={(e) => e.preventDefault()}>
          Open menu
        </button>
      ),
    });
    fireEvent.pointerDown(t, touch);
    fireEvent.click(t);
    expect(screen.queryByText('Edit rule')).not.toBeInTheDocument();
  });

  it('treats pen like touch', () => {
    const t = setup();
    fireEvent.pointerDown(t, { button: 0, pointerType: 'pen' });
    expect(screen.queryByText('Edit rule')).not.toBeInTheDocument();
    fireEvent.click(t);
    expect(screen.getByText('Edit rule')).toBeInTheDocument();
  });
});
