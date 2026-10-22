import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stubLayout } from '@/test/stubLayout';

import { hapticTick } from './haptics';
import { useSelectableItem } from './useSelectableItem';

vi.mock('./haptics', () => ({ hapticTick: vi.fn() }));

function Item({ selected = false }: { selected?: boolean }) {
  const { itemProps } = useSelectableItem({ selectable: true, selected, onSelectedChange: () => {} });
  return <div data-testid="item" role="button" tabIndex={0} {...itemProps}>row</div>;
}
const adv = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

beforeEach(() => {
  vi.stubGlobal('jest', { advanceTimersByTime: vi.advanceTimersByTime.bind(vi) });
  vi.useFakeTimers();
  vi.mocked(hapticTick).mockClear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useSelectableItem haptics', () => {
  it('ticks once when a long-press starts selection (phone)', async () => {
    stubLayout('phone');
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Item />);
    const item = screen.getByTestId('item');
    await user.pointer({ keys: '[TouchA>]', target: item });
    expect(hapticTick).not.toHaveBeenCalled();
    adv(500);
    expect(hapticTick).toHaveBeenCalledTimes(1);
    await user.pointer({ keys: '[/TouchA]', target: item });
    expect(hapticTick).toHaveBeenCalledTimes(1);
  });

  it('does not tick on a short tap', async () => {
    stubLayout('phone');
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Item />);
    const item = screen.getByTestId('item');
    await user.pointer({ keys: '[TouchA>]', target: item });
    adv(200);
    await user.pointer({ keys: '[/TouchA]', target: item });
    adv(600);
    expect(hapticTick).not.toHaveBeenCalled();
  });

  it('does not tick on desktop (no long-press)', async () => {
    stubLayout('desktop');
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Item />);
    await user.pointer({ keys: '[MouseLeft>]', target: screen.getByTestId('item') });
    adv(600);
    expect(hapticTick).not.toHaveBeenCalled();
  });
});
