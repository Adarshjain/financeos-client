'use client';

import { usePathname, useRouter } from 'next/navigation';
import React from 'react';

import { Card, cn, MessageBubble, PromptField, showToast, Text } from '@/components/ds';
import { areaCrumb, crumbMap } from '@/features/shell/navigation';
import { replaceCurrentRoute } from '@/features/shell/navigationStore';
import { appHref } from '@/features/shell/routes';
import { ShellPage } from '@/features/shell/ShellPage';
import { timeInAppZone } from '@/lib/date-range';
import { replaceUrl } from '@/lib/urlState';

import { ChatAnswer } from './ChatAnswer';
import { UNTITLED_CHAT, withNewChat, withoutChat, withQuestion, withTitle } from './chatHistory';
import { ChatHistoryPane } from './ChatHistoryPane';
import type { Conversation, ConversationSummary } from './conversation.types';
import { deleteConversation, renameConversation } from './conversationActions';
import { STARTERS } from './starters';
import { useConversation } from './useConversation';

export interface ChatScreenProps {
  /** The recent chats for the pane, as the server sent them. */
  conversations: ConversationSummary[];
  /** Today in the app zone (YYYY-MM-DD). */
  today: string;
  /** The stored conversation when one is open; absent on a new chat. */
  initial?: Conversation;
  /** A question to send once, on first render (`?q=`). */
  autoSend?: string;
}

const CHAT_HREF = appHref('/chat');
const REPORTS_HREF = appHref('/reports');
/** Every column child stops at the thread width on desktop. */
const COLUMN = 'desk:w-full desk:max-w-container-md';

/**
 * One chat page. Going to a new chat from an open one (the +, Back, deleting the open chat) lands on the same page
 * component with a new URL, so React would keep the old conversation; the session below starts over instead.
 */
export function ChatScreen(props: ChatScreenProps) {
  const pathname = usePathname();
  const [seen, setSeen] = React.useState(pathname);
  const [epoch, setEpoch] = React.useState(0);
  // The list lives here so a fresh session still shows the chats made since the page was loaded.
  const [list, setList] = React.useState(props.conversations);
  if (pathname !== seen) {
    setSeen(pathname);
    if (pathname === CHAT_HREF) setEpoch((e) => e + 1);
  }
  return <ChatSession key={epoch} {...props} list={list} setList={setList} />;
}

function ChatSession({
  list,
  setList,
  today,
  initial,
  autoSend,
}: ChatScreenProps & { list: ConversationSummary[]; setList: React.Dispatch<React.SetStateAction<ConversationSummary[]>> }) {
  const router = useRouter();
  const createdRef = React.useRef<string | null>(initial?.id ?? null);
  // The page this session started on: a chat created after the visitor left it must not rewrite another page's URL.
  const startPath = React.useRef<string | null>(null);
  React.useEffect(() => {
    startPath.current = window.location.pathname;
  }, []);

  const convo = useConversation({
    initial,
    onConversationCreated: (id) => {
      createdRef.current = id;
      setList((prev) => withNewChat(prev, id));
      if (window.location.pathname !== startPath.current) return;
      // The URL follows the chat without a reload or a refetch.
      const href = appHref(`/chat/${id}`);
      replaceCurrentRoute(href);
      replaceUrl(href);
    },
    onQuestionSent: () => {
      if (createdRef.current) setList((prev) => withQuestion(prev, createdRef.current as string));
    },
    onTitle: (title) => {
      if (createdRef.current) setList((prev) => withTitle(prev, createdRef.current as string, title));
    },
  });
  const { records, busy, send: sendQuestion, stop, retry } = convo;

  const send = React.useCallback(
    (question: string) => {
      void sendQuestion(question);
    },
    [sendQuestion],
  );

  // `?q=` sends once. The ref also holds through StrictMode's second effect run.
  const autoSent = React.useRef(false);
  React.useEffect(() => {
    if (autoSend && !autoSent.current) {
      autoSent.current = true;
      send(autoSend);
    }
  }, [autoSend, send]);

  const started = records.length > 0;
  const currentId = convo.conversationId;
  const currentRow = list.find((c) => c.id === currentId);
  const title = !started ? 'Ask the data' : currentRow?.title?.trim() || convo.title?.trim() || UNTITLED_CHAT;

  // A new question scrolls into view.
  const lastUserRef = React.useRef<HTMLDivElement | null>(null);
  const userCount = records.filter((r) => r.kind === 'user').length;
  React.useEffect(() => {
    if (userCount > 0) lastUserRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }, [userCount]);

  const lastRecord = records[records.length - 1];
  const asking = lastRecord?.kind === 'assistant' && lastRecord.status !== 'running' && Boolean(lastRecord.clarify) && Boolean(lastRecord.clarifyOptions?.length);
  const placeholder = busy ? 'Ask a follow-up…' : asking ? 'Pick one, or type your own answer…' : started ? 'Ask about your money…' : 'Ask about your money…';

  const rename = async (id: string, next: string) => {
    const result = await renameConversation(id, next);
    if (!result.success) {
      showToast(result.error.message || "Couldn't rename the chat. Try again.", { tone: 'danger' });
      return false;
    }
    setList((prev) => withTitle(prev, id, result.data.title ?? next));
    return true;
  };

  const remove = async (id: string) => {
    const result = await deleteConversation(id);
    if (!result.success) {
      showToast(result.error.message || "Couldn't delete the chat. Try again.", { tone: 'danger' });
      return false;
    }
    setList((prev) => withoutChat(prev, id));
    if (id === currentId) router.push(CHAT_HREF);
    return true;
  };

  let lastUserIndex = -1;
  records.forEach((r, i) => {
    if (r.kind === 'user') lastUserIndex = i;
  });

  return (
    <ShellPage
      crumb={
        started ? (
          <>
            <span className="desk:hidden">{crumbMap.chat.label}</span>
            <span className="max-desk:hidden">{areaCrumb('chat')}</span>
          </>
        ) : (
          areaCrumb('chat')
        )
      }
      title={title}
      addHref={CHAT_HREF}
      addLabel="New chat"
      backHref={started ? CHAT_HREF : REPORTS_HREF}
    >
      <div className="flex flex-col desk:flex-row desk:items-start gap-space-8 desk:gap-space-24">
        <aside className={cn('order-3 desk:order-1 desk:w-72 desk:shrink-0 flex flex-col gap-space-8 desk:sticky desk:top-safe-56 desk:self-start desk:max-h-dvh desk:overflow-y-auto', started && 'max-desk:hidden')}>
          <ChatHistoryPane
            conversations={list}
            currentId={currentId}
            answeringId={busy ? currentId : null}
            today={today}
            onOpen={(id) => {
              if (id !== currentId) router.push(appHref(`/chat/${id}`));
            }}
            onRename={rename}
            onDelete={remove}
          />
        </aside>

        <div className="max-desk:contents desk:order-2 desk:flex desk:flex-1 desk:min-w-0 desk:flex-col desk:items-center">
          {!started ? (
            <>
              <div className={cn(COLUMN, 'order-1 desk:pt-space-64 desk:pb-space-8')}>
                <Text as="h1" variant="page-title" family="display" className="desk:text-center">
                  What do you want to know?
                </Text>
              </div>
              <div className={cn(COLUMN, 'order-2 desk:order-3 flex gap-space-12 overflow-x-auto desk:overflow-visible desk:grid desk:grid-cols-3 desk:pt-space-12')}>
                {STARTERS.map((s) => (
                  <Card key={s.prompt} asChild className="max-desk:w-container-xs max-desk:shrink-0">
                    <button type="button" className="text-left flex flex-col gap-space-6 p-space-16 desk:p-space-16" onClick={() => send(s.prompt)}>
                      <Text variant="overline" tone="ink-3">
                        {s.category}
                      </Text>
                      <Text variant="body">{s.prompt}</Text>
                    </button>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className={cn(COLUMN, 'order-1 flex flex-col gap-space-8 desk:gap-space-20 desk:pb-space-24 max-desk:pb-space-96')}>
              {records.map((r, i) =>
                r.kind === 'user' ? (
                  <MessageBubble
                    key={r.id}
                    ref={i === lastUserIndex ? lastUserRef : undefined}
                    meta={r.createdAt ? timeInAppZone(r.createdAt) : undefined}
                    className="scroll-mt-space-64"
                  >
                    {r.text}
                  </MessageBubble>
                ) : (
                  <ChatAnswer
                    key={r.id}
                    record={r}
                    conversationId={currentId}
                    last={i === records.length - 1}
                    busy={busy}
                    onSend={send}
                    onAskAgain={() => void retry()}
                  />
                ),
              )}
            </div>
          )}

          <div className={cn(
              COLUMN,
              'z-sticky pt-space-8 pb-safe-12 desk:pb-space-16 max-desk:order-5 max-desk:fixed max-desk:inset-x-0 max-desk:bottom-0 max-desk:px-space-16 desk:sticky desk:bottom-0',
              !started ? 'desk:order-2' : 'order-2',
            )}>
            <PromptField
              placeholder={placeholder}
              loading={busy}
              onSubmit={send}
              onStop={stop}
              hint={busy ? 'Answering · you can type the next question' : undefined}
              autoFocus={!started && !autoSend}
            />
          </div>
        </div>
      </div>
    </ShellPage>
  );
}
