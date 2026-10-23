import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stubLayout } from '@/test/stubLayout';

import { useSelectableItem, type UseSelectableItemOptions } from './useSelectableItem';

function Item(o: UseSelectableItemOptions) {
  const { itemProps, nestedControlProps } = useSelectableItem(o);
  return (
    <div data-testid="item" role="button" tabIndex={0} {...itemProps}>
      row
      <span {...nestedControlProps}>
        <button type="button" onClick={() => {}}>inner</button>
      </span>
    </div>
  );
}

function setup(o: UseSelectableItemOptions = {}) {
  const onPress = vi.fn();
  const onSelectedChange = vi.fn();
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<Item selectable onPress={onPress} onSelectedChange={onSelectedChange} {...o} />);
  return { user, onPress, onSelectedChange, item: screen.getByTestId('item') };
}
// jsdom rects are all zero; React Aria only counts a release as a press when it lands inside the target rect.
const giveSize = (el: HTMLElement) => {
  el.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, right: 400, bottom: 100, width: 400, height: 100, toJSON() {} });
};
const adv = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

beforeEach(() => {
  // RTL's asyncWrapper only advances fake timers when a `jest` global exists; without it
  // every user-event call hangs under vitest fake timers.
  vi.stubGlobal('jest', { advanceTimersByTime: vi.advanceTimersByTime.bind(vi) });
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe.each([
  ['touch', '[TouchA>]', '[/TouchA]'],
  ['mouse', '[MouseLeft>]', '[/MouseLeft]'],
])('%s press', (_n, down, up) => {
  it('release at 300ms is a tap (onPress), not a long-press', async () => {
    const { user, item, onPress, onSelectedChange } = setup();
    await user.pointer({ keys: down, target: item });
    adv(300);
    await user.pointer({ keys: up, target: item });
    adv(600);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onSelectedChange).not.toHaveBeenCalled();
  });
  it('tap outside selection mode: onPress only, never select', async () => {
    const { user, item, onPress, onSelectedChange } = setup();
    await user.pointer({ keys: down, target: item });
    await user.pointer({ keys: up, target: item });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onSelectedChange).not.toHaveBeenCalled();
  });
  it('20px move between down and up: no tap, no long-press', async () => {
    const { user, item, onPress, onSelectedChange } = setup();
    giveSize(item);
    await user.pointer({ keys: down, target: item, coords: { clientX: 10, clientY: 10 } });
    await user.pointer({ target: item, coords: { clientX: 30, clientY: 10 } });
    adv(600);
    await user.pointer({ keys: up, target: item, coords: { clientX: 30, clientY: 10 } });
    expect(onPress).not.toHaveBeenCalled();
    expect(onSelectedChange).not.toHaveBeenCalled();
  });
  it('swipe with pointer capture (item never sees the moves): still no tap, no long-press', async () => {
    const { user, item, onPress, onSelectedChange } = setup();
    giveSize(item);
    await user.pointer({ keys: down, target: item, coords: { clientX: 10, clientY: 10 } });
    // pointermove delivered to the capturing ancestor/document, not to the item
    await user.pointer({ target: document.body, coords: { clientX: 40, clientY: 10 } });
    adv(600);
    await user.pointer({ keys: up, target: item, coords: { clientX: 40, clientY: 10 } });
    expect(onPress).not.toHaveBeenCalled();
    expect(onSelectedChange).not.toHaveBeenCalled();
  });
  it('a 5px wobble is still a tap', async () => {
    const { user, item, onPress } = setup();
    giveSize(item);
    await user.pointer({ keys: down, target: item, coords: { clientX: 10, clientY: 10 } });
    await user.pointer({ target: item, coords: { clientX: 15, clientY: 12 } });
    await user.pointer({ keys: up, target: item, coords: { clientX: 15, clientY: 12 } });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it('selectable:false -> long-press nothing, tap calls onPress', async () => {
    const { user, item, onPress, onSelectedChange } = setup({ selectable: false });
    await user.pointer({ keys: down, target: item });
    adv(600);
    await user.pointer({ keys: up, target: item });
    expect(onSelectedChange).not.toHaveBeenCalled();
    // React Aria: no long-press registered, so the slow release is an ordinary press.
    expect(onPress).toHaveBeenCalledTimes(1);
    await user.pointer({ keys: down, target: item });
    await user.pointer({ keys: up, target: item });
    expect(onPress).toHaveBeenCalledTimes(2);
  });
  it('disabled -> nothing fires', async () => {
    const { user, item, onPress, onSelectedChange } = setup({ disabled: true });
    await user.pointer({ keys: down, target: item });
    adv(600);
    await user.pointer({ keys: up, target: item });
    await user.pointer({ keys: down, target: item });
    await user.pointer({ keys: up, target: item });
    expect(onPress).not.toHaveBeenCalled();
    expect(onSelectedChange).not.toHaveBeenCalled();
  });
  it('inner button press acts alone', async () => {
    const { user, onPress, onSelectedChange } = setup({ selectionMode: true });
    const btn = screen.getByRole('button', { name: 'inner' });
    await user.pointer({ keys: down, target: btn });
    adv(600);
    await user.pointer({ keys: up, target: btn });
    await user.click(btn);
    expect(onPress).not.toHaveBeenCalled();
    expect(onSelectedChange).not.toHaveBeenCalled();
  });
});

// Long-press and tap-to-toggle belong to the phone layout, with any pointer (owner, 2026-10-18).
describe.each([
  ['touch', '[TouchA>]', '[/TouchA]'],
  ['mouse', '[MouseLeft>]', '[/MouseLeft]'],
])('phone layout, %s: long-press and selection', (_n, down, up) => {
  beforeEach(() => stubLayout('phone'));
  it('selects before release; release triggers nothing more', async () => {
    const { user, item, onPress, onSelectedChange } = setup();
    await user.pointer({ keys: down, target: item });
    expect(onSelectedChange).not.toHaveBeenCalled();
    adv(500);
    expect(onSelectedChange).toHaveBeenCalledTimes(1);
    expect(onSelectedChange).toHaveBeenCalledWith(true);
    await user.pointer({ keys: up, target: item });
    expect(onSelectedChange).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });
  it('tap in selection mode toggles on and off, no onPress', async () => {
    const a = setup({ selectionMode: true, selected: false });
    await a.user.pointer({ keys: down, target: a.item });
    await a.user.pointer({ keys: up, target: a.item });
    expect(a.onSelectedChange).toHaveBeenCalledWith(true);
    expect(a.onPress).not.toHaveBeenCalled();
    document.body.innerHTML = '';
    const b = setup({ selectionMode: true, selected: true });
    await b.user.pointer({ keys: down, target: b.item });
    await b.user.pointer({ keys: up, target: b.item });
    expect(b.onSelectedChange).toHaveBeenCalledWith(false);
    expect(b.onPress).not.toHaveBeenCalled();
  });
  it('iOS: long-press w/o click, then a separate quick tap works', async () => {
    const { user, item, onPress, onSelectedChange } = setup();
    await user.pointer({ keys: down, target: item });
    adv(500);
    await user.pointer({ keys: up, target: item });
    expect(onSelectedChange).toHaveBeenCalledTimes(1);
    adv(1000);
    await user.pointer({ keys: down, target: item });
    await user.pointer({ keys: up, target: item });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

// Desktop layout: no long-press, and a press always opens the item; the checkbox selects (owner, 2026-10-18).
describe.each([
  ['touch', '[TouchA>]', '[/TouchA]'],
  ['mouse', '[MouseLeft>]', '[/MouseLeft]'],
])('desktop layout, %s', (_n, down, up) => {
  beforeEach(() => stubLayout('desktop'));
  it('holding past the threshold does not select; the release opens the item', async () => {
    const { user, item, onPress, onSelectedChange } = setup();
    giveSize(item);
    await user.pointer({ keys: down, target: item });
    adv(800);
    expect(onSelectedChange).not.toHaveBeenCalled();
    await user.pointer({ keys: up, target: item });
    expect(onSelectedChange).not.toHaveBeenCalled();
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it('a press in selection mode opens the item and never toggles', async () => {
    const a = setup({ selectionMode: true, selected: false });
    await a.user.pointer({ keys: down, target: a.item });
    await a.user.pointer({ keys: up, target: a.item });
    expect(a.onPress).toHaveBeenCalledTimes(1);
    expect(a.onSelectedChange).not.toHaveBeenCalled();
    document.body.innerHTML = '';
    const b = setup({ selectionMode: true, selected: true });
    await b.user.pointer({ keys: down, target: b.item });
    await b.user.pointer({ keys: up, target: b.item });
    expect(b.onPress).toHaveBeenCalledTimes(1);
    expect(b.onSelectedChange).not.toHaveBeenCalled();
  });
});

describe('Ctrl+press', () => {
  it('desktop layout: a Ctrl+click (the macOS right-click) does not open the item', async () => {
    stubLayout('desktop');
    const { user, item, onPress } = setup();
    giveSize(item);
    await user.keyboard('{Control>}');
    await user.pointer({ keys: '[MouseLeft>]', target: item });
    await user.pointer({ keys: '[/MouseLeft]', target: item });
    await user.keyboard('{/Control}');
    expect(onPress).not.toHaveBeenCalled();
  });
  it('desktop layout: a plain click still opens it', async () => {
    stubLayout('desktop');
    const { user, item, onPress } = setup();
    giveSize(item);
    await user.pointer({ keys: '[MouseLeft>]', target: item });
    await user.pointer({ keys: '[/MouseLeft]', target: item });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('keyboard', () => {
  it('Enter/Space on the inner button does not trigger the item', async () => {
    const { user, onPress, onSelectedChange } = setup({ selectionMode: true });
    screen.getByRole('button', { name: 'inner' }).focus();
    await user.keyboard('{Enter} ');
    expect(onPress).not.toHaveBeenCalled();
    expect(onSelectedChange).not.toHaveBeenCalled();
  });
  it.each([['{Enter}'], [' ']])('%s outside selection mode -> onPress', async (k) => {
    const { user, item, onPress, onSelectedChange } = setup();
    item.focus();
    await user.keyboard(k);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onSelectedChange).not.toHaveBeenCalled();
  });
  it.each([['{Enter}'], [' ']])('%s in selection mode, phone layout -> toggles', async (k) => {
    stubLayout('phone');
    const { user, item, onPress, onSelectedChange } = setup({ selectionMode: true, selected: true });
    item.focus();
    await user.keyboard(k);
    expect(onSelectedChange).toHaveBeenCalledTimes(1);
    expect(onSelectedChange).toHaveBeenCalledWith(false);
    expect(onPress).not.toHaveBeenCalled();
  });
  it.each([['{Enter}'], [' ']])('%s in selection mode, desktop layout -> onPress', async (k) => {
    stubLayout('desktop');
    const { user, item, onPress, onSelectedChange } = setup({ selectionMode: true, selected: true });
    item.focus();
    await user.keyboard(k);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onSelectedChange).not.toHaveBeenCalled();
  });
});

describe('propagation', () => {
  it('ancestors still receive pointerdown (SwipeActions relies on it)', async () => {
    const seen: string[] = [];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <div onPointerDown={() => seen.push('down')} onPointerUp={() => seen.push('up')}>
        <Item selectable onPress={() => {}} onSelectedChange={() => {}} />
      </div>,
    );
    const item = screen.getByTestId('item');
    await user.pointer({ keys: '[MouseLeft>]', target: item });
    await user.pointer({ keys: '[/MouseLeft]', target: item });
    expect(seen).toEqual(['down', 'up']);
  });
});
