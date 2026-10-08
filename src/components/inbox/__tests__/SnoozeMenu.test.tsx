import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SnoozeMenu } from '../SnoozeMenu';

describe('SnoozeMenu', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-08T06:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  async function open() {
    const user = userEvent.setup();
    const onSnooze = vi.fn();
    render(<SnoozeMenu title="HDFC bill" onSnooze={onSnooze} />);
    await user.click(screen.getByRole('button', { name: 'Snooze HDFC bill' }));
    return { user, onSnooze };
  }

  it('lists the three presets and a custom date entry', async () => {
    await open();
    expect(await screen.findByRole('menuitem', { name: 'Tomorrow' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'In 3 days' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Next week' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Pick a date/ })).toBeInTheDocument();
  });

  it.each([
    ['Tomorrow', '2026-10-09'],
    ['In 3 days', '2026-10-11'],
    ['Next week', '2026-10-15'],
  ])('%s snoozes until %s (IST today + n)', async (label, until) => {
    const { user, onSnooze } = await open();
    await user.click(await screen.findByRole('menuitem', { name: label }));
    expect(onSnooze).toHaveBeenCalledTimes(1);
    expect(onSnooze).toHaveBeenCalledWith(until);
  });

  it('"Pick a date" opens a dialog with "Remind me on" defaulting to tomorrow; Snooze submits it', async () => {
    const { user, onSnooze } = await open();
    await user.click(await screen.findByRole('menuitem', { name: /Pick a date/ }));
    expect(await screen.findByText('Snooze until')).toBeInTheDocument();
    const input = screen.getByLabelText('Remind me on');
    expect(input).toHaveValue('09/10/2026');
    await user.click(screen.getByRole('button', { name: 'Snooze' }));
    expect(onSnooze).toHaveBeenCalledWith('2026-10-09');
    expect(screen.queryByText('Snooze until')).not.toBeInTheDocument();
  });

  it('a custom later date is submitted as ISO', async () => {
    const { user, onSnooze } = await open();
    await user.click(await screen.findByRole('menuitem', { name: /Pick a date/ }));
    const input = await screen.findByLabelText('Remind me on');
    await user.clear(input);
    await user.type(input, '20102026');
    await user.click(screen.getByRole('button', { name: 'Snooze' }));
    expect(onSnooze).toHaveBeenCalledWith('2026-10-20');
  });

  it('rejects today: "Pick a date after today", and does not snooze', async () => {
    const { user, onSnooze } = await open();
    await user.click(await screen.findByRole('menuitem', { name: /Pick a date/ }));
    const input = await screen.findByLabelText('Remind me on');
    await user.clear(input);
    await user.type(input, '08102026');
    await user.click(screen.getByRole('button', { name: 'Snooze' }));
    expect(screen.getByText('Pick a date after today')).toBeInTheDocument();
    expect(onSnooze).not.toHaveBeenCalled();
  });

  it('rejects a past date', async () => {
    const { user, onSnooze } = await open();
    await user.click(await screen.findByRole('menuitem', { name: /Pick a date/ }));
    const input = await screen.findByLabelText('Remind me on');
    await user.clear(input);
    await user.type(input, '01012026');
    await user.click(screen.getByRole('button', { name: 'Snooze' }));
    expect(screen.getByText('Pick a date after today')).toBeInTheDocument();
    expect(onSnooze).not.toHaveBeenCalled();
  });

  it('an empty or incomplete date asks to pick one', async () => {
    const { user, onSnooze } = await open();
    await user.click(await screen.findByRole('menuitem', { name: /Pick a date/ }));
    const input = await screen.findByLabelText('Remind me on');
    await user.clear(input);
    await user.type(input, '2010');
    await user.click(screen.getByRole('button', { name: 'Snooze' }));
    expect(screen.getByText('Pick a date')).toBeInTheDocument();
    expect(onSnooze).not.toHaveBeenCalled();
  });

  it('Cancel closes without snoozing', async () => {
    const { user, onSnooze } = await open();
    await user.click(await screen.findByRole('menuitem', { name: /Pick a date/ }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Snooze until')).not.toBeInTheDocument();
    expect(onSnooze).not.toHaveBeenCalled();
  });

  it('reopening resets the date to tomorrow and clears the error', async () => {
    const { user } = await open();
    await user.click(await screen.findByRole('menuitem', { name: /Pick a date/ }));
    const input = await screen.findByLabelText('Remind me on');
    await user.clear(input);
    await user.type(input, '08102026');
    await user.click(screen.getByRole('button', { name: 'Snooze' }));
    expect(screen.getByText('Pick a date after today')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await user.click(screen.getByRole('button', { name: 'Snooze HDFC bill' }));
    await user.click(await screen.findByRole('menuitem', { name: /Pick a date/ }));
    expect(await screen.findByLabelText('Remind me on')).toHaveValue('09/10/2026');
    expect(screen.queryByText('Pick a date after today')).not.toBeInTheDocument();
  });
});
