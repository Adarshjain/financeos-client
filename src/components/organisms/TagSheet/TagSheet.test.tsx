import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TagSheet, type TagSheetProps } from './TagSheet';

const TAGS = [
  { id: 't1', name: 'Goa trip', transactionCount: 14 },
  { id: 't2', name: 'Gifts', transactionCount: 3 },
];

function setup(over: Partial<TagSheetProps> = {}) {
  const props = {
    open: true,
    tags: TAGS,
    value: ['t1'],
    onValueChange: vi.fn(),
    onOpenChange: vi.fn(),
    onCreate: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
    ...over,
  };
  render(<TagSheet {...props} />);
  return props;
}

describe('TagSheet', () => {
  it('lists the tags with their counts and ticks the ones in value', () => {
    setup();
    expect(screen.getByText('Goa trip')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox', { hidden: true })[0]).toBeChecked();
    expect(screen.getAllByRole('checkbox', { hidden: true })[1]).not.toBeChecked();
  });

  it('reports a tick and an untick', () => {
    const p = setup();
    fireEvent.click(screen.getByText('Gifts'));
    expect(p.onValueChange).toHaveBeenLastCalledWith(['t1', 't2']);
    fireEvent.click(screen.getByText('Goa trip'));
    expect(p.onValueChange).toHaveBeenLastCalledWith([]);
  });

  it('offers Create for a new name, and not for an existing one', () => {
    const p = setup();
    const search = screen.getByLabelText('Find a tag');
    fireEvent.change(search, { target: { value: 'goa trip' } });
    expect(screen.queryByText(/^Create/)).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'Pune' } });
    fireEvent.click(screen.getByText('Create "Pune"'));
    expect(p.onCreate).toHaveBeenCalledWith('Pune');
  });

  it('closes on Done', () => {
    const p = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(p.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Manage renames a tag through the name dialog', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const p = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Manage' }));
    expect(screen.getByText('Manage tags')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'More options' })[0]);
    await user.click(await screen.findByRole('menuitem', { name: 'Rename' }));
    const field = screen.getByLabelText('Name');
    fireEvent.change(field, { target: { value: 'Goa 2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    expect(p.onRename).toHaveBeenCalledWith(TAGS[0], 'Goa 2026');
  });

  it('Manage deletes a tag only after the confirm says what goes', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const p = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Manage' }));
    await user.click(screen.getAllByRole('button', { name: 'More options' })[1]);
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    expect(p.onDelete).not.toHaveBeenCalled();
    const confirm = await screen.findByRole('dialog', { name: 'Delete Gifts?' });
    expect(within(confirm).getByText('Deleting a tag removes it from its transactions. Nothing else changes.')).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete tag' }));
    expect(p.onDelete).toHaveBeenCalledWith(TAGS[1]);
  });

  it('shows no Manage and no Create without their handlers', () => {
    setup({ onRename: undefined, onDelete: undefined, onCreate: undefined });
    expect(screen.queryByRole('button', { name: 'Manage' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Find a tag'), { target: { value: 'Pune' } });
    expect(screen.queryByText(/^Create/)).not.toBeInTheDocument();
  });
});
