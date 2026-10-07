import { fireEvent, render, screen } from '@testing-library/react';
import { Check, Trash2 } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { type SwipeAction,SwipeActionRow } from '@/components/ui/swipe-action-row';
import { COMMIT_PX } from '@/components/ui/swipe-action-row.helpers';

const touch = { pointerType: 'touch', isPrimary: true, pointerId: 1 };
const START = { clientX: 200, clientY: 100 };

function makeActions() {
  const leading: SwipeAction = { label: 'Approve', icon: Check, tone: 'success', onCommit: vi.fn() };
  const trailing: SwipeAction = { label: 'Delete', icon: Trash2, tone: 'danger', onCommit: vi.fn() };
  return { leading, trailing };
}

function renderRow(props: Partial<React.ComponentProps<typeof SwipeActionRow>> = {}) {
  const actions = makeActions();
  const onChildClick = vi.fn();
  render(
    <SwipeActionRow leading={actions.leading} trailing={actions.trailing} {...props}>
      <button type="button" onClick={onChildClick}>
        Row content
      </button>
    </SwipeActionRow>,
  );
  const content = screen.getByText('Row content').closest(
    '[data-slot="swipe-action-row-content"]',
  ) as HTMLElement;
  const root = content.parentElement as HTMLElement;
  return { ...actions, onChildClick, content, root };
}

function down(el: HTMLElement, init: Record<string, unknown> = {}) {
  fireEvent.pointerDown(el, { ...touch, ...START, ...init });
}
function move(el: HTMLElement, dx: number, dy = 0, init: Record<string, unknown> = {}) {
  fireEvent.pointerMove(el, {
    ...touch,
    clientX: START.clientX + dx,
    clientY: START.clientY + dy,
    ...init,
  });
}
function up(el: HTMLElement, init: Record<string, unknown> = {}) {
  fireEvent.pointerUp(el, { ...touch, ...START, ...init });
}

describe('SwipeActionRow', () => {
  it('commits the leading action once on a rightward swipe past the threshold and snaps back', () => {
    const { leading, trailing, content } = renderRow();

    down(content);
    move(content, COMMIT_PX + 10);
    expect(content.style.transform).toBe(`translateX(${COMMIT_PX + 10}px)`);
    up(content);

    expect(leading.onCommit).toHaveBeenCalledTimes(1);
    expect(trailing.onCommit).not.toHaveBeenCalled();
    expect(content.style.transform).toBe('translateX(0px)');
  });

  it('commits the trailing action on a leftward swipe past the threshold', () => {
    const { leading, trailing, content } = renderRow();

    down(content);
    move(content, -(COMMIT_PX + 10));
    up(content);

    expect(trailing.onCommit).toHaveBeenCalledTimes(1);
    expect(leading.onCommit).not.toHaveBeenCalled();
  });

  it('does not commit when released short of the threshold', () => {
    const { leading, trailing, content } = renderRow();

    down(content);
    move(content, COMMIT_PX - 1);
    up(content);

    expect(leading.onCommit).not.toHaveBeenCalled();
    expect(trailing.onCommit).not.toHaveBeenCalled();
    expect(content.style.transform).toBe('translateX(0px)');
  });

  it('ignores mouse pointers so desktop drags never swipe', () => {
    const { leading, content } = renderRow();

    down(content, { pointerType: 'mouse' });
    move(content, COMMIT_PX + 10, 0, { pointerType: 'mouse' });
    expect(content.style.transform).toBe('translateX(0px)');
    up(content, { pointerType: 'mouse' });

    expect(leading.onCommit).not.toHaveBeenCalled();
  });

  it('ignores a non-primary touch and moves from a pointer that did not start the gesture', () => {
    const { leading, content } = renderRow();

    down(content, { isPrimary: false });
    move(content, COMMIT_PX + 10);
    expect(content.style.transform).toBe('translateX(0px)');
    up(content);
    expect(leading.onCommit).not.toHaveBeenCalled();

    down(content);
    move(content, COMMIT_PX + 10, 0, { pointerId: 2 });
    expect(content.style.transform).toBe('translateX(0px)');
    up(content, { pointerId: 2 });
    expect(leading.onCommit).not.toHaveBeenCalled();
  });

  it('locks to the vertical axis on a scroll-like start and ignores later horizontal travel', () => {
    const { leading, content } = renderRow();

    down(content);
    move(content, 2, 20);
    move(content, COMMIT_PX + 40, 20);
    expect(content.style.transform).toBe('translateX(0px)');
    up(content);

    expect(leading.onCommit).not.toHaveBeenCalled();
  });

  it('stays put while travel is under the axis-lock distance', () => {
    const { content } = renderRow();

    down(content);
    move(content, 3, 2);
    expect(content.style.transform).toBe('translateX(0px)');
    expect(content.classList.contains('transition-none')).toBe(false);
  });

  it('snaps back without committing on pointercancel', () => {
    const { leading, content } = renderRow();

    down(content);
    move(content, COMMIT_PX + 10);
    fireEvent.pointerCancel(content, { ...touch, ...START });

    expect(leading.onCommit).not.toHaveBeenCalled();
    expect(content.style.transform).toBe('translateX(0px)');
  });

  it('reveals only the active side and flips the armed state at the threshold', () => {
    const { root, content } = renderRow();

    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();

    down(content);
    move(content, COMMIT_PX - 1);
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    expect(root).not.toHaveAttribute('data-armed');

    move(content, COMMIT_PX);
    expect(root).toHaveAttribute('data-armed', 'true');
    up(content);

    down(content);
    move(content, -COMMIT_PX);
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    up(content);
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('drops transitions while dragging and restores them on release', () => {
    const { content } = renderRow();

    down(content);
    move(content, 30);
    expect(content.classList.contains('transition-none')).toBe(true);
    up(content);
    expect(content.classList.contains('transition-transform')).toBe(true);
    expect(content.classList.contains('transition-none')).toBe(false);
    // Reduced-motion users never get the slide, via the CSS variant alone.
    expect(content.classList.contains('motion-reduce:transition-none')).toBe(true);
  });

  it('swallows the click that follows a horizontal swipe but lets a plain tap through', () => {
    const { onChildClick, content } = renderRow();
    const child = screen.getByText('Row content');

    down(content);
    move(content, 30);
    up(content);
    fireEvent.click(child);
    expect(onChildClick).not.toHaveBeenCalled();

    down(content);
    up(content);
    fireEvent.click(child);
    expect(onChildClick).toHaveBeenCalledTimes(1);
  });

  it('clears a stale suppression flag on the next press when the browser never sent the click', () => {
    const { onChildClick, content } = renderRow();
    const child = screen.getByText('Row content');

    down(content);
    move(content, 30);
    up(content);
    // No click delivered for the swipe; the next tap must still work.
    down(content);
    up(content);
    fireEvent.click(child);
    expect(onChildClick).toHaveBeenCalledTimes(1);
  });

  it('ignores every gesture while disabled', () => {
    const { leading, content } = renderRow({ disabled: true });

    down(content);
    move(content, COMMIT_PX + 10);
    expect(content.style.transform).toBe('translateX(0px)');
    up(content);

    expect(leading.onCommit).not.toHaveBeenCalled();
  });

  it('clamps a rightward swipe to 0 when there is no leading action', () => {
    const { trailing, content } = renderRow({ leading: undefined });

    down(content);
    move(content, COMMIT_PX + 10);
    expect(content.style.transform).toBe('translateX(0px)');
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    up(content);

    expect(trailing.onCommit).not.toHaveBeenCalled();
  });

  it('completes the gesture even when pointer capture throws', () => {
    const { leading, content } = renderRow();
    content.setPointerCapture = () => {
      throw new Error('InvalidPointerId');
    };
    content.releasePointerCapture = () => {
      throw new Error('InvalidPointerId');
    };

    down(content);
    move(content, COMMIT_PX + 10);
    up(content);

    expect(leading.onCommit).toHaveBeenCalledTimes(1);
  });

  it('uses pointer capture when the element supports it', () => {
    const { content } = renderRow();
    const setCapture = vi.fn();
    const releaseCapture = vi.fn();
    content.setPointerCapture = setCapture;
    content.releasePointerCapture = releaseCapture;

    down(content);
    move(content, 30);
    expect(setCapture).toHaveBeenCalledWith(1);
    up(content);
    expect(releaseCapture).toHaveBeenCalledWith(1);
  });

  it('merges className onto the root and marks it with the data-slot hook', () => {
    const { root } = renderRow({ className: 'sm:rounded-lg' });

    expect(root).toHaveAttribute('data-slot', 'swipe-action-row');
    expect(root.className).toContain('touch-pan-y');
    expect(root.className).toContain('sm:rounded-lg');
  });
});
