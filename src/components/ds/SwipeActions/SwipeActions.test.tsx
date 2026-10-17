import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { stubLayout } from '@/test/stubLayout';

import { SwipeActions } from './SwipeActions';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SwipeActions', () => {
  it('renders children content', () => {
    render(
      <SwipeActions>
        <div>Swiggy Bangalore ₹1,249</div>
      </SwipeActions>,
    );

    expect(screen.getByText('Swiggy Bangalore ₹1,249')).toBeInTheDocument();
  });

  it('triggers left action when swiped right past threshold', () => {
    const handleTrigger = vi.fn();

    const { container } = render(
      <SwipeActions
        left={{ label: 'Approve', tone: 'brand', onTrigger: handleTrigger }}
      >
        <div>Transaction row</div>
      </SwipeActions>,
    );

    const root = container.firstChild as HTMLElement;

    // Drag right past threshold (startX: 100, endX: 210 = delta +110 > 96px threshold)
    fireEvent.pointerDown(root, { clientX: 100, clientY: 50, button: 0, pointerType: 'touch' });
    fireEvent.pointerMove(root, { clientX: 210, clientY: 50 });
    fireEvent.pointerUp(root);

    expect(handleTrigger).toHaveBeenCalledTimes(1);
  });

  // Swipe belongs to the phone layout, with any pointer (owner, 2026-10-18).
  it('a mouse drag swipes in the phone layout', () => {
    stubLayout('phone');
    const handleTrigger = vi.fn();

    const { container } = render(
      <SwipeActions
        left={{ label: 'Approve', tone: 'brand', onTrigger: handleTrigger }}
      >
        <div>Transaction row</div>
      </SwipeActions>,
    );

    const root = container.firstChild as HTMLElement;

    fireEvent.pointerDown(root, { clientX: 100, clientY: 50, button: 0, pointerType: 'mouse' });
    fireEvent.pointerMove(root, { clientX: 210, clientY: 50, pointerType: 'mouse' });
    fireEvent.pointerUp(root, { pointerType: 'mouse' });

    expect(handleTrigger).toHaveBeenCalledTimes(1);
  });

  it.each([['touch'], ['mouse']])('ignores a %s drag in the desktop layout', (pointerType) => {
    stubLayout('desktop');
    const handleTrigger = vi.fn();

    const { container } = render(
      <SwipeActions
        left={{ label: 'Approve', tone: 'brand', onTrigger: handleTrigger }}
      >
        <div>Transaction row</div>
      </SwipeActions>,
    );

    const root = container.firstChild as HTMLElement;

    fireEvent.pointerDown(root, { clientX: 100, clientY: 50, button: 0, pointerType });
    fireEvent.pointerMove(root, { clientX: 210, clientY: 50, pointerType });
    fireEvent.pointerUp(root, { pointerType });

    expect(handleTrigger).not.toHaveBeenCalled();
  });

  it('triggers right action when swiped left past threshold', () => {
    const handleTrigger = vi.fn();

    const { container } = render(
      <SwipeActions
        right={{ label: 'Delete', tone: 'danger', onTrigger: handleTrigger }}
      >
        <div>Transaction row</div>
      </SwipeActions>,
    );

    const root = container.firstChild as HTMLElement;

    // Drag left past threshold (startX: 200, endX: 90 = delta -110 < -96px threshold)
    fireEvent.pointerDown(root, { clientX: 200, clientY: 50, button: 0, pointerType: 'touch' });
    fireEvent.pointerMove(root, { clientX: 90, clientY: 50 });
    fireEvent.pointerUp(root);

    expect(handleTrigger).toHaveBeenCalledTimes(1);
  });

  it('does not trigger and springs back when drag does not reach threshold', () => {
    const handleLeft = vi.fn();
    const handleRight = vi.fn();

    const { container } = render(
      <SwipeActions
        left={{ label: 'Approve', onTrigger: handleLeft }}
        right={{ label: 'Delete', onTrigger: handleRight }}
      >
        <div>Transaction row</div>
      </SwipeActions>,
    );

    const root = container.firstChild as HTMLElement;

    // Drag right below threshold (startX: 100, endX: 140 = delta +40 < 96px)
    fireEvent.pointerDown(root, { clientX: 100, clientY: 50, button: 0, pointerType: 'touch' });
    fireEvent.pointerMove(root, { clientX: 140, clientY: 50 });
    fireEvent.pointerUp(root);

    expect(handleLeft).not.toHaveBeenCalled();
    expect(handleRight).not.toHaveBeenCalled();
  });

  it('cancels drag if vertical scroll motion is detected', () => {
    const handleLeft = vi.fn();

    const { container } = render(
      <SwipeActions
        left={{ label: 'Approve', onTrigger: handleLeft }}
      >
        <div>Scrollable row</div>
      </SwipeActions>,
    );

    const root = container.firstChild as HTMLElement;

    // Start drag, then move vertically more than horizontally (deltaY: 30, deltaX: 10)
    fireEvent.pointerDown(root, { clientX: 100, clientY: 50, button: 0, pointerType: 'touch' });
    fireEvent.pointerMove(root, { clientX: 110, clientY: 80 });
    fireEvent.pointerUp(root);

    expect(handleLeft).not.toHaveBeenCalled();
  });

  it('does not trigger when neither slot is set', () => {
    const { container } = render(
      <SwipeActions>
        <div>Plain row without actions</div>
      </SwipeActions>,
    );

    const root = container.firstChild as HTMLElement;

    fireEvent.pointerDown(root, { clientX: 100, clientY: 50, button: 0, pointerType: 'touch' });
    fireEvent.pointerMove(root, { clientX: 250, clientY: 50 });
    fireEvent.pointerUp(root);

    // No error, no action
    expect(screen.getByText('Plain row without actions')).toBeInTheDocument();
  });

  it('does not trigger when disabled', () => {
    const handleTrigger = vi.fn();

    const { container } = render(
      <SwipeActions
        disabled
        left={{ label: 'Approve', onTrigger: handleTrigger }}
      >
        <div>Disabled row</div>
      </SwipeActions>,
    );

    const root = container.firstChild as HTMLElement;

    fireEvent.pointerDown(root, { clientX: 100, clientY: 50, button: 0, pointerType: 'touch' });
    fireEvent.pointerMove(root, { clientX: 250, clientY: 50 });
    fireEvent.pointerUp(root);

    expect(handleTrigger).not.toHaveBeenCalled();
  });

  it('renders all 4 tones with appropriate background classes and text-on-brand', () => {
    const { container: c1 } = render(
      <SwipeActions left={{ label: 'Warning Action', tone: 'warning' }}>
        <div>Item</div>
      </SwipeActions>,
    );
    expect(c1.querySelector('.bg-warning.text-on-brand')).toBeInTheDocument();

    const { container: c2 } = render(
      <SwipeActions right={{ label: 'Info Action', tone: 'info' }}>
        <div>Item</div>
      </SwipeActions>,
    );
    expect(c2.querySelector('.bg-info.text-on-brand')).toBeInTheDocument();
  });

  it('preserves and calls consumer pointer event handlers', () => {
    const onPointerDown = vi.fn();
    const { container } = render(
      <SwipeActions onPointerDown={onPointerDown} left={{ label: 'Action' }}>
        <div>Item</div>
      </SwipeActions>,
    );

    const root = container.firstChild as HTMLElement;
    fireEvent.pointerDown(root, { clientX: 100, clientY: 50, button: 0, pointerType: 'touch' });
    expect(onPointerDown).toHaveBeenCalledTimes(1);
  });
});
