import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const screenProps = vi.hoisted(() => ({ last: null as Record<string, unknown> | null }));
vi.mock('@/features/chat/ChatScreen', () => ({
  ChatScreen: (props: Record<string, unknown>) => {
    screenProps.last = props;
    return <div>chat screen</div>;
  },
}));
const data = vi.hoisted(() => ({ list: vi.fn(), one: vi.fn() }));
vi.mock('@/features/chat/chatData', () => ({ loadChatList: data.list, loadConversation: data.one }));

import DsChatConversationPage from './[id]/page';
import DsChatPage from './page';

beforeEach(() => {
  vi.clearAllMocks();
  data.list.mockResolvedValue([{ id: 'c1' }]);
  data.one.mockResolvedValue({ id: 'c1', messages: [] });
});

describe('/chat', () => {
  it('reads ?q= on the server and hands it to the screen with the chat list', async () => {
    render(await DsChatPage({ searchParams: Promise.resolve({ q: '  spend this month ' }) }));
    expect(screen.getByText('chat screen')).toBeInTheDocument();
    expect(screen.getAllByText('chat screen')).toHaveLength(1);
    expect(screenProps.last).toMatchObject({ autoSend: 'spend this month', conversations: [{ id: 'c1' }] });
  });

  it('has no auto-send without ?q=', async () => {
    render(await DsChatPage({ searchParams: Promise.resolve({}) }));
    expect(screenProps.last?.autoSend).toBeUndefined();
  });
});

describe('/chat/[id]', () => {
  it('loads the conversation and the list together and gives both to the screen', async () => {
    render(await DsChatConversationPage({ params: Promise.resolve({ id: 'c1' }) }));
    expect(data.one).toHaveBeenCalledWith('c1');
    expect(screenProps.last).toMatchObject({ initial: { id: 'c1' }, conversations: [{ id: 'c1' }] });
  });

  it('lets a missing conversation (a 404) reach the not-found page', async () => {
    data.one.mockRejectedValue(new Error('NEXT_NOT_FOUND'));
    await expect(DsChatConversationPage({ params: Promise.resolve({ id: 'x' }) })).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
