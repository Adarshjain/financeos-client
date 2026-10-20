import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InboxSnoozeMenu, snoozeHint } from './InboxSnoozeMenu';

describe('snoozeHint', () => {
  it('reads weekday, day and month', () => {
    expect(snoozeHint('2026-10-14')).toBe('Wed 14 Oct');
  });
});

describe('InboxSnoozeMenu', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-08T06:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  async function open() {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSnooze = vi.fn();
    render(<InboxSnoozeMenu title="HDFC bill" onSnooze={onSnooze} />);
    await user.click(screen.getByRole('button', { name: 'Snooze HDFC bill' }));
    return { user, onSnooze };
  }

  it('lists the presets with their dates and a Pick a date entry', async () => {
    await open();
    expect(await screen.findByText('Tomorrow')).toBeInTheDocument();
    expect(screen.getByText('Fri 9 Oct')).toBeInTheDocument();
    expect(screen.getByText('In 3 days')).toBeInTheDocument();
    expect(screen.getByText('Sun 11 Oct')).toBeInTheDocument();
    expect(screen.getByText('Next week')).toBeInTheDocument();
    expect(screen.getByText('Thu 15 Oct')).toBeInTheDocument();
    expect(screen.getByText('Pick a date…')).toBeInTheDocument();
  });

  it.each([
    ['Tomorrow', '2026-10-09'],
    ['In 3 days', '2026-10-11'],
    ['Next week', '2026-10-15'],
  ])('%s snoozes until %s and closes', async (label, until) => {
    const { user, onSnooze } = await open();
    await user.click(await screen.findByText(label));
    expect(onSnooze).toHaveBeenCalledTimes(1);
    expect(onSnooze).toHaveBeenCalledWith(until);
    expect(screen.queryByText('Pick a date…')).not.toBeInTheDocument();
  });

  it('Pick a date turns the dropdown into a date field with Snooze; empty says Pick a date', async () => {
    const { user, onSnooze } = await open();
    await user.click(await screen.findByText('Pick a date…'));
    expect(screen.getByLabelText('Snooze until')).toBeInTheDocument();
    expect(screen.getByText('Must be after today.')).toBeInTheDocument();
    expect(screen.queryByText('Tomorrow')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Snooze' }));
    expect(await screen.findByText('Pick a date')).toBeInTheDocument();
    expect(onSnooze).not.toHaveBeenCalled();
  });

  it('a chosen date snoozes until it', async () => {
    const { user, onSnooze } = await open();
    await user.click(await screen.findByText('Pick a date…'));
    await user.type(screen.getByLabelText('Snooze until'), '20102026');
    await user.click(screen.getByRole('button', { name: 'Snooze' }));
    expect(onSnooze).toHaveBeenCalledWith('2026-10-20');
  });

  it('a date that is not after today is refused', async () => {
    const { user, onSnooze } = await open();
    await user.click(await screen.findByText('Pick a date…'));
    await user.type(screen.getByLabelText('Snooze until'), '08102026');
    await user.click(screen.getByRole('button', { name: 'Snooze' }));
    expect(await screen.findByText('Pick a date after today')).toBeInTheDocument();
    expect(onSnooze).not.toHaveBeenCalled();
  });
});
