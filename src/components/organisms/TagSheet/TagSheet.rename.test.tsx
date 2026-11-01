import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TagSheet } from './TagSheet';

const TAGS = [{ id: 't1', name: 'Goa trip', transactionCount: 14 }];

async function openRename(onRename: (...a: never[]) => unknown) {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  render(<TagSheet open tags={TAGS} value={[]} onRename={onRename as never} onDelete={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Manage' }));
  await user.click(screen.getAllByRole('button', { name: 'More options' })[0]);
  await user.click(await screen.findByRole('menuitem', { name: 'Rename' }));
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Goa 2026' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
}

describe('TagSheet rename', () => {
  it('closes the name dialog once the rename succeeds', async () => {
    await openRename(vi.fn().mockResolvedValue(undefined));
    await waitFor(() => expect(screen.queryByLabelText('Name')).toBeNull());
  });

  it('closes at once for a caller that does not return a promise', async () => {
    await openRename(vi.fn());
    await waitFor(() => expect(screen.queryByLabelText('Name')).toBeNull());
  });

  it('keeps the dialog open on an error and shows its message beside the name', async () => {
    await openRename(vi.fn().mockRejectedValue(new Error('A tag with this name already exists.')));
    expect(await screen.findByText('A tag with this name already exists.')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Goa 2026');
    expect(screen.getByRole('button', { name: 'Save name' })).toBeEnabled();
  });

  it('a retry that works closes it and clears the error', async () => {
    const onRename = vi.fn().mockRejectedValueOnce(new Error('A tag with this name already exists.')).mockResolvedValueOnce(undefined);
    await openRename(onRename);
    await screen.findByText('A tag with this name already exists.');
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Goa 2027' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(() => expect(screen.queryByLabelText('Name')).toBeNull());
    expect(onRename).toHaveBeenCalledTimes(2);
  });
});
