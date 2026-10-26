import type { ApiClient } from '../fixtures/api';
import { parseSseStream, scriptChat } from '../fixtures/chat';
import { E2E_API_URL } from '../fixtures/config';
import { llmCalls, resetLlm, setLlmMode } from '../fixtures/control';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createTransactions } from '../fixtures/seed/transactions';
import { newUser, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

/** Streams a persisted-mode question; retries only while the server reports CHAT_BUSY. */
async function ask(cookie: string, body: Record<string, unknown>) {
  let delay = 300;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${E2E_API_URL}/api/v1/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `FINANCEOS_SESSION=${cookie}` },
      body: JSON.stringify(body),
    });
    const header = res.headers.get('x-chat-error');
    if (res.status === 429 && header === 'CHAT_BUSY' && attempt < 4) {
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
      continue;
    }
    return { status: res.status, events: parseSseStream(await res.text()) };
  }
}

type Events = Awaited<ReturnType<typeof ask>>['events'];
const named = (events: Events, name: string) => events.find((e) => e.event === name)?.data;

const q = (content: string) => [{ role: 'user', content }];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function rest(api: ApiClient, method: 'GET' | 'PATCH' | 'DELETE', url: string, body?: unknown): Promise<{ status: number; data: any }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (api as any)[method](url, body === undefined ? {} : { body });
  return { status: res.response.status, data: res.data ?? res.error };
}

async function newConversation(user: { api: ApiClient; cookie: string }, question: string, answer: string) {
  await scriptChat(user.api, [{ action: 'final_answer', answer }]);
  const res = await ask(user.cookie, { messages: q(question), newConversation: true });
  expect(res.status).toBe(200);
  return { events: res.events, id: named(res.events, 'conversation').id as string };
}

test.describe('Chat history API', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async ({ api }) => {
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });
  test.afterEach(async ({ api }) => {
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });

  test('1. New conversation: conversation event first, final with messageId, then title; listed with one question', async ({ request }) => {
    const user = await newUser(request, 'hist-new');
    await resetLlm(user.api);
    const { events, id } = await newConversation(user, 'How much did I spend?', 'You spent nothing.');

    expect(events[0].event).toBe('conversation');
    expect(id).toBeTruthy();
    const final = named(events, 'final');
    expect(final.answer).toBe('You spent nothing.');
    expect(final.messageId).toBeTruthy();
    expect(final.conversationId).toBe(id);
    const titleIdx = events.findIndex((e) => e.event === 'title');
    expect(titleIdx).toBeGreaterThan(events.findIndex((e) => e.event === 'final'));
    expect(events[titleIdx].data.conversationId).toBe(id);
    expect(typeof events[titleIdx].data.title).toBe('string');

    const list = await rest(user.api, 'GET', '/api/v1/chat/conversations');
    expect(list.status).toBe(200);
    expect(list.data).toHaveLength(1);
    expect(list.data[0]).toMatchObject({ id, questionCount: 1 });
    expect(list.data[0].title).toBe(events[titleIdx].data.title);
  });

  test('2. Follow-up in the same conversation uses stored history', async ({ request }) => {
    const user = await newUser(request, 'hist-follow');
    await resetLlm(user.api);
    const { id } = await newConversation(user, 'Remember the word pineapple', 'Noted.');

    // Keyed to the stored question: the model only sees 'pineapple' if the server replays history (recorded prompts are cut at 4000 chars).
    await scriptChat(user.api, [
      { json: { action: 'final_answer', answer: 'It was pineapple.' }, promptContains: 'pineapple' },
    ]);
    const res = await ask(user.cookie, { messages: q('What was the word?'), conversationId: id });
    expect(res.status).toBe(200);
    expect(res.events.find((e) => e.event === 'conversation')).toBeUndefined();
    expect(named(res.events, 'final').conversationId).toBe(id);

    const calls = await llmCalls(user.api, 'data-chat');
    expect(calls).toHaveLength(2);
    expect(named(res.events, 'final').answer).toBe('It was pineapple.');

    const list = await rest(user.api, 'GET', '/api/v1/chat/conversations');
    expect(list.data[0].questionCount).toBe(2);
  });

  test('3. Get returns messages in order with steps and labels', async ({ request }) => {
    const user = await newUser(request, 'hist-get');
    await resetLlm(user.api);
    const acc = await createBankAccount(user.api, { name: 'History Bank' });
    await createTransactions(user.api, acc.id, 2, { amounts: [-100, -200], descriptionPrefix: 'Hist Spend' });

    await scriptChat(user.api, [
      { action: 'run_sql', sql: 'SELECT description, amount FROM V_CHAT_TRANSACTIONS' },
      { action: 'final_answer', answer: 'Two spends.' },
    ]);
    const res = await ask(user.cookie, { messages: q('List spends'), newConversation: true });
    const id = named(res.events, 'conversation').id;
    const trace = named(res.events, 'trace');
    expect(trace.label).toBeTruthy();

    const got = await rest(user.api, 'GET', `/api/v1/chat/conversations/${id}`);
    expect(got.status).toBe(200);
    expect(got.data.id).toBe(id);
    expect(got.data.messages.map((m: { role: string }) => m.role)).toEqual(['USER', 'ASSISTANT']);
    expect(got.data.messages[0].text).toBe('List spends');
    const payload = got.data.messages[1].answer;
    expect(payload.answer).toBe('Two spends.');
    expect(payload.status).toBe('COMPLETE');
    expect(payload.steps).toHaveLength(1);
    expect(payload.steps[0]).toMatchObject({ action: 'run_sql', rowCount: 2, success: true, label: trace.label });
    expect(got.data.messages[1].draftResult).toBeNull();
  });

  test('4. Retry re-runs the last question and replaces the answer', async ({ request }) => {
    const user = await newUser(request, 'hist-retry');
    await resetLlm(user.api);
    const { id } = await newConversation(user, 'Tell me something', 'First answer');

    await scriptChat(user.api, [{ action: 'final_answer', answer: 'Second answer' }]);
    const res = await ask(user.cookie, { conversationId: id, retry: true, messages: [] });
    expect(res.status).toBe(200);
    expect(named(res.events, 'final').answer).toBe('Second answer');

    const got = await rest(user.api, 'GET', `/api/v1/chat/conversations/${id}`);
    expect(got.data.messages).toHaveLength(2);
    expect(got.data.messages[1].answer.answer).toBe('Second answer');
    const list = await rest(user.api, 'GET', '/api/v1/chat/conversations');
    expect(list.data[0].questionCount).toBe(1);
  });

  test('5. Rename updates the title; an empty title is rejected', async ({ request }) => {
    const user = await newUser(request, 'hist-rename');
    await resetLlm(user.api);
    const { id } = await newConversation(user, 'Anything', 'Fine');

    const ok = await rest(user.api, 'PATCH', `/api/v1/chat/conversations/${id}`, { title: 'My renamed chat' });
    expect(ok.status).toBe(200);
    expect(ok.data.title).toBe('My renamed chat');
    expect((await rest(user.api, 'GET', `/api/v1/chat/conversations/${id}`)).data.title).toBe('My renamed chat');

    const empty = await rest(user.api, 'PATCH', `/api/v1/chat/conversations/${id}`, { title: '' });
    expect(empty.status).toBe(400);
    const long = await rest(user.api, 'PATCH', `/api/v1/chat/conversations/${id}`, { title: 'x'.repeat(121) });
    expect(long.status).toBe(400);
  });

  test('6. Delete removes the conversation', async ({ request }) => {
    const user = await newUser(request, 'hist-delete');
    await resetLlm(user.api);
    const { id } = await newConversation(user, 'Anything', 'Fine');

    expect((await rest(user.api, 'DELETE', `/api/v1/chat/conversations/${id}`)).status).toBe(204);
    expect((await rest(user.api, 'GET', `/api/v1/chat/conversations/${id}`)).status).toBe(404);
    expect((await rest(user.api, 'GET', '/api/v1/chat/conversations')).data).toEqual([]);
  });

  test('7. A draft result patch is visible when the conversation is read again', async ({ request }) => {
    const user = await newUser(request, 'hist-draft');
    await resetLlm(user.api);
    const { id, events } = await newConversation(user, 'Draft a report', 'Here is a draft.');
    const messageId = named(events, 'final').messageId;

    const draftResult = { action: 'saved', reportId: 'r-123', reportName: 'Spend KPI' };
    const patched = await rest(user.api, 'PATCH', `/api/v1/chat/conversations/${id}/messages/${messageId}`, { draftResult });
    expect(patched.status).toBe(204);

    const got = await rest(user.api, 'GET', `/api/v1/chat/conversations/${id}`);
    expect(got.data.messages.find((m: { id: string }) => m.id === messageId).draftResult).toEqual(draftResult);
  });

  test('8. The 11th conversation evicts the oldest', async ({ request }) => {
    test.slow();
    const user = await newUser(request, 'hist-evict');
    await resetLlm(user.api);
    const ids: string[] = [];
    for (let i = 1; i <= 11; i++) {
      ids.push((await newConversation(user, `Question ${i}`, `Answer ${i}`)).id);
    }

    const list = await rest(user.api, 'GET', '/api/v1/chat/conversations');
    expect(list.data).toHaveLength(10);
    expect(list.data.map((c: { id: string }) => c.id)).toEqual(ids.slice(1).reverse());
    expect((await rest(user.api, 'GET', `/api/v1/chat/conversations/${ids[0]}`)).status).toBe(404);
  });

  test('9. Another user gets 404 for every conversation route', async ({ request }) => {
    const owner = await newUser(request, 'hist-owner');
    await resetLlm(owner.api);
    const { id, events } = await newConversation(owner, 'Private question', 'Private answer');
    const messageId = named(events, 'final').messageId;
    const { api: other, user: otherUser } = await secondUser(request, 'hist-other');

    expect((await rest(other, 'GET', `/api/v1/chat/conversations/${id}`)).status).toBe(404);
    expect((await rest(other, 'PATCH', `/api/v1/chat/conversations/${id}`, { title: 'Hijack' })).status).toBe(404);
    expect((await rest(other, 'PATCH', `/api/v1/chat/conversations/${id}/messages/${messageId}`, { draftResult: { action: 'saved' } })).status).toBe(404);
    expect((await rest(other, 'DELETE', `/api/v1/chat/conversations/${id}`)).status).toBe(404);
    expect((await rest(other, 'GET', '/api/v1/chat/conversations')).data).toEqual([]);

    await scriptChat(other, [{ action: 'final_answer', answer: 'nope' }]);
    const res = await ask(otherUser.cookie, { messages: q('Hi'), conversationId: id });
    expect(res.status).toBe(404);

    // Still intact for the owner.
    expect((await rest(owner.api, 'GET', `/api/v1/chat/conversations/${id}`)).status).toBe(200);
  });
});
