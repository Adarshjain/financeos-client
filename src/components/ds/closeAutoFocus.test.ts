import { afterEach, describe, expect, it, vi } from 'vitest';

import { guardCloseAutoFocus } from './closeAutoFocus';

function closeEvent(target: Element) {
  const e = new Event('focusScope.unmountAutoFocus', { cancelable: true });
  Object.defineProperty(e, 'target', { value: target });
  return e;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('guardCloseAutoFocus', () => {
  it('keeps the focus return when focus is on body or inside the content', () => {
    const content = document.createElement('div');
    const inner = document.createElement('button');
    content.append(inner);
    document.body.append(content);
    const e1 = closeEvent(content);
    guardCloseAutoFocus()(e1);
    expect(e1.defaultPrevented).toBe(false);
    inner.focus();
    const e2 = closeEvent(content);
    guardCloseAutoFocus()(e2);
    expect(e2.defaultPrevented).toBe(false);
  });

  it('skips the focus return when focus already moved to another element', () => {
    const content = document.createElement('div');
    const other = document.createElement('button');
    document.body.append(content, other);
    other.focus();
    const e = closeEvent(content);
    guardCloseAutoFocus()(e);
    expect(e.defaultPrevented).toBe(true);
  });

  it('runs the consumer handler first and honours its preventDefault', () => {
    const content = document.createElement('div');
    document.body.append(content);
    const consumer = vi.fn((e: Event) => e.preventDefault());
    const e = closeEvent(content);
    guardCloseAutoFocus(consumer)(e);
    expect(consumer).toHaveBeenCalledTimes(1);
    expect(e.defaultPrevented).toBe(true);
  });
});
