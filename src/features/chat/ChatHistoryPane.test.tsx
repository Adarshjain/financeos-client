import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithQuery as render } from '@/test/renderWithQuery';

import { ChatHistoryPane, type ChatHistoryPaneProps } from './ChatHistoryPane';
import type { ConversationSummary } from './conversation.types';

const chat = (id: string, title: string | null, updatedAt: string, questionCount = 2): ConversationSummary => ({
  id,
  title,
  createdAt: updatedAt,
  updatedAt,
  questionCount,
});

const conversations = [
  chat('a', 'Spend in the last 90 days', '2026-10-26T08:35:00Z'),
  chat('b', 'Net worth breakdown', '2026-10-25T16:18:00Z', 1),
  chat('c', 'Who still owes me money', '2026-10-22T05:00:00Z'),
];

function setup(over: Partial<ChatHistoryPaneProps> = {}) {
  const props = {
    conversations,
    currentId: 'a',
    answeringId: null,
    today: '2026-10-26',
    onOpen: vi.fn(),
    onRename: vi.fn(() => Promise.resolve(true)),
    onDelete: vi.fn(() => Promise.resolve(true)),
    ...over,
  };
  render(<ChatHistoryPane {...props} />);
  return props;
}

const rowOf = (title: string) => screen.getByText(title).closest('[role="button"]') as HTMLElement;

describe('ChatHistoryPane', () => {
  it('shows the heading, the keep-ten caption and the groups with their rows', () => {
    setup();
    expect(screen.getByText('Recent chats')).toBeInTheDocument();
    expect(screen.getByText('Your last 10 chats are kept. A new chat removes the oldest.')).toBeInTheDocument();
    for (const g of ['Today', 'Yesterday', 'Earlier']) expect(screen.getAllByText(g).length).toBeGreaterThan(0);
    expect(within(rowOf('Spend in the last 90 days')).getByText(/2:05 pm · 2 questions/)).toBeInTheDocument();
    expect(within(rowOf('Net worth breakdown')).getByText(/9:48 pm · 1 question$/)).toBeInTheDocument();
    expect(within(rowOf('Who still owes me money')).getByText('22 Oct · 2 questions')).toBeInTheDocument();
  });

  it('highlights the open chat and opens another one on a press', () => {
    const { onOpen } = setup();
    expect(rowOf('Spend in the last 90 days').className).toContain('bg-brand-tint');
    expect(rowOf('Net worth breakdown').className).not.toContain('bg-brand-tint');
    fireEvent.click(rowOf('Net worth breakdown'));
    expect(onOpen).toHaveBeenCalledWith('b');
  });

  it('shows New chat and Answering… for a chat still being answered', () => {
    setup({ conversations: [chat('n', null, '2026-10-26T08:35:00Z', 1)], currentId: 'n', answeringId: 'n' });
    expect(screen.getByText('New chat')).toBeInTheDocument();
    expect(screen.getByText('Answering…')).toBeInTheDocument();
  });

  it('renames from the menu with the trimmed text', async () => {
    const { onRename, onOpen } = setup();
    await userEvent.click(within(rowOf('Net worth breakdown')).getByRole('button', { name: 'More options' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
    expect(onOpen).not.toHaveBeenCalled();
    const field = await screen.findByRole('textbox', { name: 'Name' });
    expect(field).toHaveValue('Net worth breakdown');
    expect(field).toHaveAttribute('maxlength', '120');
    fireEvent.change(field, { target: { value: '  Net worth  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(() => expect(onRename).toHaveBeenCalledWith('b', 'Net worth'));
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Name' })).toBeNull());
  });

  it('will not save an empty or unchanged name', async () => {
    const { onRename } = setup();
    await userEvent.click(within(rowOf('Net worth breakdown')).getByRole('button', { name: 'More options' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
    const save = await screen.findByRole('button', { name: 'Save name' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: '   ' } });
    expect(save).toBeDisabled();
    expect(onRename).not.toHaveBeenCalled();
  });

  it('keeps the rename dialog open when saving fails', async () => {
    const { onRename } = setup({ onRename: vi.fn(() => Promise.resolve(false)) });
    await userEvent.click(within(rowOf('Net worth breakdown')).getByRole('button', { name: 'More options' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
    fireEvent.change(await screen.findByRole('textbox', { name: 'Name' }), { target: { value: 'Other' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(() => expect(onRename).toHaveBeenCalled());
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
  });

  it('asks before deleting, says what goes and what stays, then deletes', async () => {
    const { onDelete } = setup();
    await userEvent.click(within(rowOf('Net worth breakdown')).getByRole('button', { name: 'More options' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete chat' }));
    expect(await screen.findByText('Delete “Net worth breakdown”?')).toBeInTheDocument();
    expect(screen.getByText("The chat and its answers go. Reports you saved from it stay. This can't be undone.")).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete chat' }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('b'));
  });

  it('does nothing when the delete is cancelled', async () => {
    const { onDelete } = setup();
    await userEvent.click(within(rowOf('Net worth breakdown')).getByRole('button', { name: 'More options' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete chat' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(onDelete).not.toHaveBeenCalled();
  });
});
