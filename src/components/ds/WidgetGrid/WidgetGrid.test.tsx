import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  WidgetGrid,
  type WidgetGridItem,
  widgetGridSpan,
  widgetGridWidthFromColumns,
} from './WidgetGrid';

beforeAll(() => {
  // jsdom has no PointerEvent: clientX/clientY would be dropped
  if (!('PointerEvent' in window)) {
    class PE extends MouseEvent {
      pointerId: number;
      constructor(type: string, init: ConstructorParameters<typeof MouseEvent>[1] & { pointerId?: number } = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
      }
    }
    (window as unknown as { PointerEvent: unknown }).PointerEvent = PE;
  }
});

afterEach(() => vi.restoreAllMocks());

const items: WidgetGridItem[] = [
  { id: 'a', width: 'quarter', label: 'Alpha', children: <p>Alpha body</p> },
  { id: 'b', width: 'half', label: 'Beta', children: <p>Beta body</p> },
  { id: 'c', width: 'full', label: 'Gamma', children: <p>Gamma body</p> },
];

const order = (c: HTMLElement) =>
  Array.from(c.querySelectorAll('[data-widget-grid-item]')).map((e) =>
    e.getAttribute('data-widget-grid-item'),
  );
const itemEl = (c: HTMLElement, id: string) =>
  c.querySelector(`[data-widget-grid-item="${id}"]`) as HTMLElement;

/** Stacks items in one row at fixed widths; the dragged one is placed by its id. */
function mockRects(c: HTMLElement, rects: Record<string, [number, number, number, number]>) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const id = this.getAttribute('data-widget-grid-item');
    if (id && rects[id]) {
      const [left, top, width, height] = rects[id];
      return {
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        x: left,
        y: top,
        toJSON: () => ({}),
      } as DOMRect;
    }
    if (this === c.firstElementChild) {
      return { left: 0, top: 0, width: 1200, height: 400, right: 1200, bottom: 400, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    }
    return { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  });
}

describe('WidgetGrid layout', () => {
  it('maps each width to a desktop span and stacks everything in one phone column', () => {
    const all: WidgetGridItem[] = (
      ['quarter', 'third', 'half', 'two-thirds', 'three-quarters', 'full'] as const
    ).map((width) => ({ id: width, width, children: <p>{width}</p> }));
    const { container } = render(<WidgetGrid items={all} />);
    const expected: Record<string, string> = {
      quarter: 'desk:col-span-3',
      third: 'desk:col-span-4',
      half: 'desk:col-span-6',
      'two-thirds': 'desk:col-span-8',
      'three-quarters': 'desk:col-span-9',
      full: 'desk:col-span-12',
    };
    for (const [id, desk] of Object.entries(expected)) {
      expect(itemEl(container, id)).toHaveClass(desk);
      // phone: no span classes, so every widget takes the single column
      expect(itemEl(container, id).className).not.toContain('max-desk:col-span');
    }
    expect(container.firstElementChild).toHaveClass('grid-cols-1', 'desk:grid-cols-12');
    expect(container.firstElementChild?.className).not.toContain('grid-cols-2');
  });

  it('exports the width helpers', () => {
    expect(widgetGridSpan('two-thirds')).toBe(8);
    expect(widgetGridWidthFromColumns(25)).toBe('quarter');
    expect(widgetGridWidthFromColumns(34)).toBe('third');
    expect(widgetGridWidthFromColumns(70)).toBe('two-thirds');
    expect(widgetGridWidthFromColumns(100)).toBe('full');
  });

  it('renders in layout order with the layout width, appending items not listed', () => {
    const { container } = render(
      <WidgetGrid
        items={items}
        layout={[
          { id: 'c', width: 'half' },
          { id: 'zzz', width: 'half' },
          { id: 'a', width: 'full' },
        ]}
      />,
    );
    expect(order(container)).toEqual(['c', 'a', 'b']);
    expect(itemEl(container, 'c')).toHaveClass('desk:col-span-6');
    expect(itemEl(container, 'a')).toHaveClass('desk:col-span-12');
    expect(itemEl(container, 'b')).toHaveClass('desk:col-span-6');
  });

  it('renders the footer after the last item, full width', () => {
    render(<WidgetGrid items={items} footer={<p>Drop here</p>} />);
    expect(screen.getByText('Drop here').parentElement).toHaveClass('col-span-full');
  });

  it('forwards ref and native props', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<WidgetGrid ref={ref} items={items} data-testid="grid" className="mt-space-8" />);
    expect(ref.current).toBe(screen.getByTestId('grid'));
    expect(ref.current).toHaveClass('mt-space-8');
  });
});

describe('WidgetGrid edit mode', () => {
  it('shows no handles and no inert when not editing', () => {
    const { container } = render(<WidgetGrid items={items} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('[inert]')).toBeNull();
  });

  it('an interactive item keeps its content usable while editing; the others stay inert', () => {
    render(
      <WidgetGrid
        editing
        items={[
          { id: 'h', width: 'full', interactive: true, children: <input aria-label="Header title" /> },
          { id: 'w', width: 'half', children: <input aria-label="Other" /> },
        ]}
      />,
    );
    expect(screen.getByLabelText('Header title').closest('[inert]')).toBeNull();
    expect(screen.getByLabelText('Other', { selector: 'input' }).closest('[inert]')).not.toBeNull();
  });

  it('shows grip, resize handle and editActions, and makes content inert', () => {
    const withActions = items.map((i) => ({ ...i, editActions: <button>Remove {i.id}</button> }));
    const { container } = render(<WidgetGrid items={withActions} editing />);
    expect(screen.getByRole('button', { name: 'Drag to reorder Alpha' })).toBeInTheDocument();
    const resize = screen.getByRole('button', { name: 'Resize Alpha' });
    expect(resize.parentElement).toHaveClass('hidden', 'desk:flex');
    expect(screen.getByText('Alpha body').closest('[inert]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Remove a' }).closest('[inert]')).toBeNull();
    expect(container.querySelectorAll('[data-widget-grid-grip]')).toHaveLength(3);
  });

  it('uses custom labels', () => {
    render(<WidgetGrid items={items} editing dragLabel="Move" resizeLabel="Stretch" />);
    expect(screen.getByRole('button', { name: 'Move Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stretch Alpha' })).toBeInTheDocument();
  });

  it('keeps the grip but drops the resize handle on a non-resizable item', () => {
    render(
      <WidgetGrid
        items={[{ id: 'h', width: 'full', resizable: false, label: 'Head', children: <p>Head</p> }]}
        editing
      />,
    );
    expect(screen.getByRole('button', { name: 'Drag to reorder Head' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resize Head' })).toBeNull();
  });
});

describe('WidgetGrid drag to reorder', () => {
  const rects: Record<string, [number, number, number, number]> = {
    a: [0, 0, 300, 100],
    b: [300, 0, 600, 100],
    c: [0, 100, 1200, 100],
  };

  function setup(extra: Partial<React.ComponentProps<typeof WidgetGrid>> = {}) {
    const onLayoutChange = vi.fn();
    const utils = render(
      <WidgetGrid items={items} editing onLayoutChange={onLayoutChange} {...extra} />,
    );
    mockRects(utils.container, rects);
    return { ...utils, onLayoutChange };
  }

  it('keeps every item its own stacking context and lifts only the dragged one', () => {
    const { container } = setup();
    for (const id of ['a', 'b', 'c']) expect(itemEl(container, id)).toHaveClass('isolate');
    const grip = screen.getByRole('button', { name: 'Drag to reorder Alpha' });
    fireEvent.pointerDown(grip, { clientX: 10, clientY: 10, pointerId: 1 });
    expect(itemEl(container, 'a')).toHaveClass('z-sticky', 'shadow-level-3');
    expect(itemEl(container, 'b').className).not.toContain('z-');
    expect(itemEl(container, 'c').className).not.toContain('z-');
    // the item's own grip stays inside it (z-floating is local to the isolated item)
    expect(itemEl(container, 'b').contains(screen.getByRole('button', { name: 'Drag to reorder Beta' }))).toBe(true);
  });

  it('gives the edit frame an opaque surface so a dragged item is solid', () => {
    const { container } = render(<WidgetGrid items={items} editing />);
    for (const id of ['a', 'b', 'c']) expect(itemEl(container, id)).toHaveClass('bg-surface');
    const view = render(<WidgetGrid items={items} />);
    expect(itemEl(view.container, 'a')).not.toHaveClass('bg-surface');
  });

  it('uses zero-min tracks so wide content cannot widen the page', () => {
    const { container } = render(<WidgetGrid items={items} editing />);
    expect(container.firstElementChild).toHaveClass('min-w-0', 'max-w-full', 'grid-cols-1');
    expect(itemEl(container, 'a').firstElementChild).toHaveClass('grid-cols-1', 'min-w-0');
  });

  it('previews the new order while dragging and commits on release', () => {
    const { container, onLayoutChange } = setup();
    const grip = screen.getByRole('button', { name: 'Drag to reorder Alpha' });
    fireEvent.pointerDown(grip, { clientX: 10, clientY: 10, pointerId: 1 });
    // pointer over the right half of Beta, in the first row: Alpha lands after Beta
    fireEvent.pointerMove(grip, { clientX: 800, clientY: 50, pointerId: 1 });
    expect(order(container)).toEqual(['b', 'a', 'c']);
    expect(itemEl(container, 'a').style.transform).toContain('translate(');
    expect(onLayoutChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(grip, { pointerId: 1 });
    expect(onLayoutChange).toHaveBeenCalledWith([
      { id: 'b', width: 'half' },
      { id: 'a', width: 'quarter' },
      { id: 'c', width: 'full' },
    ]);
    expect(itemEl(container, 'a').style.transform).toBe('');
  });

  it('can drag to the front', () => {
    const { container, onLayoutChange } = setup();
    const grip = screen.getByRole('button', { name: 'Drag to reorder Gamma' });
    fireEvent.pointerDown(grip, { clientX: 10, clientY: 150, pointerId: 1 });
    fireEvent.pointerMove(grip, { clientX: 5, clientY: 5, pointerId: 1 });
    expect(order(container)).toEqual(['c', 'a', 'b']);
    fireEvent.pointerUp(grip, { pointerId: 1 });
    expect(onLayoutChange.mock.calls[0][0].map((l: { id: string }) => l.id)).toEqual(['c', 'a', 'b']);
  });

  it('does not report a change when dropped where it started', () => {
    const { onLayoutChange } = setup();
    const grip = screen.getByRole('button', { name: 'Drag to reorder Alpha' });
    fireEvent.pointerDown(grip, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(grip, { clientX: 20, clientY: 20, pointerId: 1 });
    fireEvent.pointerUp(grip, { pointerId: 1 });
    expect(onLayoutChange).not.toHaveBeenCalled();
  });

  it('Escape restores the order and reports nothing', () => {
    const { container, onLayoutChange } = setup();
    const grip = screen.getByRole('button', { name: 'Drag to reorder Alpha' });
    fireEvent.pointerDown(grip, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(grip, { clientX: 800, clientY: 50, pointerId: 1 });
    expect(order(container)).toEqual(['b', 'a', 'c']);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(order(container)).toEqual(['a', 'b', 'c']);
    fireEvent.pointerUp(grip, { pointerId: 1 });
    expect(onLayoutChange).not.toHaveBeenCalled();
    expect(itemEl(container, 'a').style.transform).toBe('');
  });

  it('pointercancel restores the order', () => {
    const { container, onLayoutChange } = setup();
    const grip = screen.getByRole('button', { name: 'Drag to reorder Alpha' });
    fireEvent.pointerDown(grip, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(grip, { clientX: 800, clientY: 50, pointerId: 1 });
    fireEvent.pointerCancel(grip, { pointerId: 1 });
    expect(order(container)).toEqual(['a', 'b', 'c']);
    expect(onLayoutChange).not.toHaveBeenCalled();
  });

  it('scrolls the page when the pointer is near the bottom edge', () => {
    const raf = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const scroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
    setup();
    const grip = screen.getByRole('button', { name: 'Drag to reorder Alpha' });
    const clientH = document.documentElement.clientHeight || 768;
    Object.defineProperty(document.documentElement, 'clientHeight', { value: clientH, configurable: true });
    fireEvent.pointerDown(grip, { clientX: 10, clientY: clientH - 10, pointerId: 1 });
    const tick = raf.mock.calls[0][0] as (t: number) => void;
    act(() => {
      tick(0);
    });
    expect(scroll).toHaveBeenCalled();
    expect(scroll.mock.calls[0][1]).toBeGreaterThan(0);
    fireEvent.pointerUp(grip, { pointerId: 1 });
  });
});

describe('WidgetGrid resize', () => {
  function setup(extra: Partial<React.ComponentProps<typeof WidgetGrid>> = {}) {
    const onLayoutChange = vi.fn();
    const utils = render(
      <WidgetGrid items={items} editing onLayoutChange={onLayoutChange} {...extra} />,
    );
    mockRects(utils.container, {
      a: [0, 0, 300, 100],
      b: [300, 0, 600, 100],
      c: [0, 100, 1200, 100],
    });
    return { ...utils, onLayoutChange };
  }

  it('snaps live to the nearest step and commits on release', () => {
    const { container, onLayoutChange } = setup();
    const handle = screen.getByRole('button', { name: 'Resize Alpha' });
    fireEvent.pointerDown(handle, { clientX: 300, clientY: 90, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 600, clientY: 90, pointerId: 1 });
    expect(itemEl(container, 'a')).toHaveClass('desk:col-span-6');
    fireEvent.pointerMove(handle, { clientX: 1100, clientY: 90, pointerId: 1 });
    expect(itemEl(container, 'a')).toHaveClass('desk:col-span-12');
    fireEvent.pointerMove(handle, { clientX: 800, clientY: 90, pointerId: 1 });
    expect(itemEl(container, 'a')).toHaveClass('desk:col-span-8');
    expect(onLayoutChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(onLayoutChange).toHaveBeenCalledWith([
      { id: 'a', width: 'two-thirds' },
      { id: 'b', width: 'half' },
      { id: 'c', width: 'full' },
    ]);
  });

  it('Escape restores the width', () => {
    const { container, onLayoutChange } = setup();
    const handle = screen.getByRole('button', { name: 'Resize Alpha' });
    fireEvent.pointerDown(handle, { clientX: 300, clientY: 90, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 600, clientY: 90, pointerId: 1 });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(itemEl(container, 'a')).toHaveClass('desk:col-span-3');
    expect(onLayoutChange).not.toHaveBeenCalled();
  });
});

describe('WidgetGrid controlled and uncontrolled', () => {
  const rects: Record<string, [number, number, number, number]> = {
    a: [0, 0, 300, 100],
    b: [300, 0, 600, 100],
    c: [0, 100, 1200, 100],
  };
  const dragAOverB = () => {
    const grip = screen.getByRole('button', { name: 'Drag to reorder Alpha' });
    fireEvent.pointerDown(grip, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(grip, { clientX: 800, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(grip, { pointerId: 1 });
  };

  it('uncontrolled keeps the new order from defaultLayout', () => {
    const onLayoutChange = vi.fn();
    const { container } = render(
      <WidgetGrid
        items={items}
        editing
        defaultLayout={items.map(({ id, width }) => ({ id, width }))}
        onLayoutChange={onLayoutChange}
      />,
    );
    mockRects(container, rects);
    dragAOverB();
    expect(order(container)).toEqual(['b', 'a', 'c']);
    expect(onLayoutChange).toHaveBeenCalledTimes(1);
  });

  it('controlled stays put until the parent applies the layout', () => {
    const onLayoutChange = vi.fn();
    const layout = items.map(({ id, width }) => ({ id, width }));
    const { container, rerender } = render(
      <WidgetGrid items={items} editing layout={layout} onLayoutChange={onLayoutChange} />,
    );
    mockRects(container, rects);
    dragAOverB();
    expect(onLayoutChange).toHaveBeenCalledTimes(1);
    expect(order(container)).toEqual(['a', 'b', 'c']);
    rerender(
      <WidgetGrid
        items={items}
        editing
        layout={onLayoutChange.mock.calls[0][0]}
        onLayoutChange={onLayoutChange}
      />,
    );
    expect(order(container)).toEqual(['b', 'a', 'c']);
  });
});
