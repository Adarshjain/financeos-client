import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSheetDrag } from './useSheetDrag';

const phone = vi.hoisted(() => ({ value: true }));
vi.mock('./phoneLayout', () => ({ isPhoneLayout: () => phone.value }));

function touch(target: Element, type: string, x: number, y: number) {
  const t = { identifier: 1, target, clientX: x, clientY: y } as unknown as Touch;
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(ev, {
    touches: type === 'touchend' ? [] : [t],
    changedTouches: [t],
  });
  target.dispatchEvent(ev);
  return ev;
}

function setup(opts: { enabled?: boolean } = {}) {
  const panel = document.createElement('div');
  const body = document.createElement('div');
  const input = document.createElement('input');
  const button = document.createElement('button');
  body.style.overflowY = 'auto';
  body.append(input, button);
  panel.append(body);
  document.body.append(panel);
  Object.defineProperty(panel, 'offsetHeight', { value: 400 });
  Object.defineProperty(body, 'scrollHeight', { value: 1000, configurable: true });
  Object.defineProperty(body, 'clientHeight', { value: 300 });
  const backdrop = document.createElement('div');
  const onDismiss = vi.fn();
  const { result } = renderHook(() =>
    useSheetDrag({ onDismiss, enabled: opts.enabled, backdropRef: { current: backdrop } }),
  );
  result.current(panel);
  return { panel, body, input, button, backdrop, onDismiss, ref: result.current };
}

const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

describe('useSheetDrag', () => {
  beforeEach(() => {
    phone.value = true;
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('drags down from the body when not scrolled, follows the finger and closes past 25%', async () => {
    const { panel, body, onDismiss, backdrop } = setup();
    touch(body, 'touchstart', 100, 100);
    touch(body, 'touchmove', 100, 140);
    vi.advanceTimersByTime(300);
    const last = touch(body, 'touchmove', 100, 308);
    expect(last.defaultPrevented).toBe(true);
    await frame();
    expect(panel.style.transform).toBe('translate3d(0, 200px, 0)');
    expect(backdrop.style.opacity).toBe('0.5');
    touch(body, 'touchend', 100, 308);
    expect(panel.hasAttribute('data-drag-closing')).toBe(true);
    expect(panel.style.transform).toBe('translate3d(0, 100%, 0)');
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('springs back below the threshold without dismissing', async () => {
    const { panel, body, onDismiss } = setup();
    touch(body, 'touchstart', 100, 100);
    vi.advanceTimersByTime(300);
    touch(body, 'touchmove', 100, 150);
    await frame();
    touch(body, 'touchend', 100, 150);
    expect(panel.style.transform).toBe('translate3d(0, 0, 0)');
    vi.advanceTimersByTime(500);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(panel.style.transform).toBe('');
    expect(panel.hasAttribute('data-drag-closing')).toBe(false);
  });

  it('closes on a fast flick even below 25%', () => {
    const { body, onDismiss } = setup();
    touch(body, 'touchstart', 100, 100);
    vi.advanceTimersByTime(20);
    touch(body, 'touchmove', 100, 160);
    touch(body, 'touchend', 100, 160);
    vi.advanceTimersByTime(500);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not drag when the content is scrolled; the content scrolls', () => {
    const { panel, body, onDismiss } = setup();
    body.scrollTop = 120;
    touch(body, 'touchstart', 100, 100);
    const ev = touch(body, 'touchmove', 100, 300);
    expect(ev.defaultPrevented).toBe(false);
    touch(body, 'touchend', 100, 300);
    expect(panel.style.transform).toBe('');
    vi.advanceTimersByTime(500);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('ignores horizontal and upward moves', () => {
    const { panel, body, onDismiss } = setup();
    touch(body, 'touchstart', 100, 100);
    expect(touch(body, 'touchmove', 220, 120).defaultPrevented).toBe(false);
    touch(body, 'touchend', 220, 400);
    touch(body, 'touchstart', 100, 300);
    expect(touch(body, 'touchmove', 100, 200).defaultPrevented).toBe(false);
    touch(body, 'touchend', 100, 500);
    expect(panel.style.transform).toBe('');
    vi.advanceTimersByTime(500);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('does nothing in the desktop layout', () => {
    phone.value = false;
    const { body, onDismiss } = setup();
    touch(body, 'touchstart', 100, 100);
    expect(touch(body, 'touchmove', 100, 400).defaultPrevented).toBe(false);
    touch(body, 'touchend', 100, 400);
    vi.advanceTimersByTime(500);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', () => {
    const { body, onDismiss } = setup({ enabled: false });
    touch(body, 'touchstart', 100, 100);
    expect(touch(body, 'touchmove', 100, 400).defaultPrevented).toBe(false);
    touch(body, 'touchend', 100, 400);
    vi.advanceTimersByTime(500);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('ignores a gesture that starts in an input or a data-sheet-no-drag element', () => {
    const { body, input, onDismiss } = setup();
    touch(input, 'touchstart', 100, 100);
    expect(touch(input, 'touchmove', 100, 400).defaultPrevented).toBe(false);
    touch(input, 'touchend', 100, 400);
    const keep = document.createElement('div');
    keep.setAttribute('data-sheet-no-drag', '');
    body.append(keep);
    touch(keep, 'touchstart', 100, 100);
    expect(touch(keep, 'touchmove', 100, 400).defaultPrevented).toBe(false);
    vi.advanceTimersByTime(500);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('swallows the click after a drag but not after a plain tap', () => {
    const { body, button } = setup();
    const onClick = vi.fn();
    body.addEventListener('click', onClick);
    touch(button, 'touchstart', 100, 100);
    touch(button, 'touchmove', 100, 140);
    touch(button, 'touchend', 100, 140);
    button.click();
    expect(onClick).not.toHaveBeenCalled();

    touch(button, 'touchstart', 100, 100);
    touch(button, 'touchend', 100, 100);
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('blurs a focused input in the panel when the drag locks', () => {
    const { body, input } = setup();
    input.focus();
    expect(document.activeElement).toBe(input);
    touch(body, 'touchstart', 100, 100);
    touch(body, 'touchmove', 100, 140);
    expect(document.activeElement).not.toBe(input);
  });

  it('resets inline styles when the panel is detached', async () => {
    const { panel, body, backdrop, ref } = setup();
    touch(body, 'touchstart', 100, 100);
    touch(body, 'touchmove', 100, 140);
    await frame();
    expect(panel.style.transform).not.toBe('');
    ref(null);
    expect(panel.style.transform).toBe('');
    expect(backdrop.style.opacity).toBe('');
  });

  it('writes the scrim fade as CSS variables and clears them with the panel', async () => {
    const panel = document.createElement('div');
    const body = document.createElement('div');
    panel.append(body);
    document.body.append(panel);
    Object.defineProperty(panel, 'offsetHeight', { value: 400 });
    const scrim = document.createElement('div');
    const onDismiss = vi.fn();
    const { result } = renderHook(() => useSheetDrag({ onDismiss, scrimRef: { current: scrim } }));
    result.current(panel);
    touch(body, 'touchstart', 100, 100);
    touch(body, 'touchmove', 100, 140);
    vi.advanceTimersByTime(300);
    touch(body, 'touchmove', 100, 308);
    await frame();
    expect(scrim.style.getPropertyValue('--ds-scrim-opacity')).toBe('0.5');
    expect(scrim.style.getPropertyValue('--ds-scrim-ease')).toBe('none');
    touch(body, 'touchend', 100, 308);
    expect(scrim.style.getPropertyValue('--ds-scrim-opacity')).toBe('0');
    expect(scrim.style.getPropertyValue('--ds-scrim-ease')).toContain('opacity');
    result.current(null);
    expect(scrim.style.getPropertyValue('--ds-scrim-opacity')).toBe('');
  });

  it('does not swallow the next click after a drag ends in touchcancel', async () => {
    const { body, input } = setup();
    touch(body, 'touchstart', 100, 100);
    touch(body, 'touchmove', 100, 140);
    touch(body, 'touchmove', 100, 160);
    touch(body, 'touchcancel', 100, 160);
    vi.advanceTimersByTime(150);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    input.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
  });

  it('a gesture that starts in an input clears a pending swallowed click', () => {
    const { body, input } = setup();
    touch(body, 'touchstart', 100, 100);
    touch(body, 'touchmove', 100, 140);
    touch(body, 'touchmove', 100, 160);
    touch(body, 'touchcancel', 100, 160);
    touch(input, 'touchstart', 100, 100);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    input.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
  });
});
