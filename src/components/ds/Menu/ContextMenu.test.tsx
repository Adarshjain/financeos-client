import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ContextMenu } from './ContextMenu';

function setViewport(desktop: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: desktop,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function setup(onApprove = vi.fn(), onDelete = vi.fn(), items = true) {
  render(
    <ContextMenu
      items={
        items
          ? [
              { id: 'approve', label: 'Approve', onSelect: onApprove },
              { id: 'delete', label: 'Delete', tone: 'danger', onSelect: onDelete },
            ]
          : []
      }
    >
      <div data-testid="row">Row</div>
    </ContextMenu>,
  );
  return screen.getByTestId('row');
}

describe('ContextMenu', () => {
  afterEach(() => vi.restoreAllMocks());

  it('opens at the pointer on desktop and blocks the native menu', () => {
    setViewport(true);
    const row = setup();
    const notPrevented = fireEvent.contextMenu(row, { clientX: 120, clientY: 80 });
    expect(notPrevented).toBe(false);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
    const anchor = document.body.querySelector('span[data-context-anchor]') as HTMLElement;
    expect(anchor.style.left).toBe('120px');
    expect(anchor.style.top).toBe('80px');
  });

  it('does nothing in the phone layout', () => {
    setViewport(false);
    const row = setup();
    const notPrevented = fireEvent.contextMenu(row, { clientX: 10, clientY: 10 });
    expect(notPrevented).toBe(true);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('keeps the native menu when there are no actions', () => {
    setViewport(true);
    const row = setup(vi.fn(), vi.fn(), false);
    expect(fireEvent.contextMenu(row)).toBe(true);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('runs the chosen handler and closes', () => {
    setViewport(true);
    const onApprove = vi.fn();
    const onDelete = vi.fn();
    const row = setup(onApprove, onDelete);
    fireEvent.contextMenu(row);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onApprove).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape', () => {
    setViewport(true);
    const row = setup();
    fireEvent.contextMenu(row);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on a click away', async () => {
    setViewport(true);
    const row = setup();
    fireEvent.contextMenu(row);
    // Radix arms its outside-press listener on the next tick.
    await new Promise((r) => setTimeout(r, 10));
    fireEvent.pointerDown(document.body, { button: 0, pointerType: 'mouse' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('leaves the menu where it is when the right-click lands inside it', () => {
    setViewport(true);
    const row = setup();
    fireEvent.contextMenu(row, { clientX: 120, clientY: 80 });
    fireEvent.contextMenu(screen.getByRole('menuitem', { name: 'Approve' }), { clientX: 300, clientY: 200 });
    const anchor = document.body.querySelector('span[data-context-anchor]') as HTMLElement;
    expect(anchor.style.left).toBe('120px');
    expect(anchor.style.top).toBe('80px');
  });

  it('anchors a keyboard-opened menu at the row, not at 0,0', () => {
    setViewport(true);
    const row = setup();
    row.getBoundingClientRect = () => ({ left: 40, bottom: 90, top: 50, right: 400, width: 360, height: 40, x: 40, y: 50, toJSON: () => ({}) });
    fireEvent.contextMenu(row, { clientX: 0, clientY: 0 });
    const anchor = document.body.querySelector('span[data-context-anchor]') as HTMLElement;
    expect(anchor.style.left).toBe('40px');
    expect(anchor.style.top).toBe('90px');
  });
});
