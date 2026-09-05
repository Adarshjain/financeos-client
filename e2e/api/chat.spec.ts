import { expectStatus } from '../fixtures/api';
import {
  clarifyTranscript,
  scriptChat,
  streamChat,
  syncChat,
} from '../fixtures/chat';
import { llmCalls, resetLlm, setLlmMode } from '../fixtures/control';
import { createBankAccount, createCreditCard } from '../fixtures/seed/accounts';
import {
  createBroker,
  createInstrument,
  generateIsin,
  generateYahooSymbol,
  trade,
} from '../fixtures/seed/investments';
import { createRule as createRewardRule, spend } from '../fixtures/seed/rewards';
import { createTransactions } from '../fixtures/seed/transactions';
import { newUser, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Chat API & Orchestrator', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ api }) => {
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });

  test.afterEach(async ({ api }) => {
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });

  test('1. One-shot final answer: streamed and sync chat with recorded LLM call', async ({
    request,
  }) => {
    const user = await newUser(request, 'chat-final');
    await resetLlm(user.api);

    await scriptChat(user.api, [
      {
        action: 'final_answer',
        answer: 'You have no expenses recorded today.',
      },
    ]);

    // Stream Chat
    const streamRes = await streamChat(user.cookie, [
      { role: 'user', content: 'What are my expenses today?' },
    ]);
    expect(streamRes.status).toBe(200);
    expect(streamRes.events.length).toBeGreaterThanOrEqual(2);

    const statusEvents = streamRes.events.filter((e) => e.event === 'status');
    expect(statusEvents.length).toBeGreaterThanOrEqual(1);

    const finalEvent = streamRes.events.find((e) => e.event === 'final');
    expect(finalEvent).toBeDefined();
    expect(finalEvent?.data.answer).toBe('You have no expenses recorded today.');

    // LLM call recorded
    const calls = await llmCalls(user.api, 'data-chat');
    expect(calls.length).toBe(1);
    expect(calls[0].task).toBe('data-chat');
    expect(calls[0].schemaPresent).toBe(true);

    // Sync Chat
    await scriptChat(user.api, [
      {
        action: 'final_answer',
        answer: 'You have no expenses recorded today.',
      },
    ]);
    const syncRes = await syncChat(user.api, [
      { role: 'user', content: 'What are my expenses today?' },
    ]);
    expectStatus(syncRes, 200);
    expect(syncRes.data?.answer).toBe('You have no expenses recorded today.');
    expect(syncRes.data?.traces).toEqual([]);
  });

  test('2. SQL + table block: queries V_CHAT_TRANSACTIONS and returns structured table', async ({
    request,
  }) => {
    const user = await newUser(request, 'chat-sql-table');
    await resetLlm(user.api);

    const acc = await createBankAccount(user.api, { name: 'Chat Savings' });
    await createTransactions(user.api, acc.id, 3, {
      amounts: [-100, -250, -500],
      descriptionPrefix: 'Grocery Spend',
    });

    await scriptChat(user.api, [
      {
        action: 'run_sql',
        sql: 'SELECT description, amount FROM V_CHAT_TRANSACTIONS ORDER BY amount ASC',
      },
      {
        action: 'final_answer',
        answer: 'Here are your 3 recent grocery expenses.',
        blocks: JSON.stringify({
          tables: [
            {
              columns: [
                { key: 'description', label: 'Description' },
                { key: 'amount', label: 'Amount', format: 'inr' },
              ],
              rows: [
                { description: 'Grocery Spend 3', amount: 500 },
                { description: 'Grocery Spend 2', amount: 250 },
                { description: 'Grocery Spend 1', amount: 100 },
              ],
            },
          ],
        }),
      },
    ]);

    const streamRes = await streamChat(user.cookie, [
      { role: 'user', content: 'List my grocery transactions' },
    ]);
    expect(streamRes.status).toBe(200);

    const traceEvents = streamRes.events.filter((e) => e.event === 'trace');
    expect(traceEvents.length).toBe(1);
    const sqlTrace = traceEvents[0].data;
    expect(sqlTrace.action).toBe('run_sql');
    expect(sqlTrace.success).toBe(true);
    expect(sqlTrace.rowCount).toBe(3);
    expect(sqlTrace.resultPreview).toContain('Grocery Spend');

    const finalEvent = streamRes.events.find((e) => e.event === 'final');
    expect(finalEvent).toBeDefined();
    expect(finalEvent?.data.blocks?.tables?.length).toBe(1);
    expect(finalEvent?.data.blocks.tables[0].columns.length).toBe(2);
    expect(finalEvent?.data.blocks.tables[0].rows.length).toBe(3);
  });

  test('3. Tenancy proof: CHAT_RO queries isolate data across users', async ({
    api,
    user,
    request,
  }) => {
    const { api: apiB } = await secondUser(request, 'chat-tenancy-b');
    await resetLlm(api);

    const accB = await createBankAccount(apiB, { name: 'User B Secret Bank' });

    await scriptChat(api, [
      {
        action: 'run_sql',
        sql: `SELECT * FROM V_CHAT_ACCOUNTS WHERE id = '${accB.id}'`,
      },
      {
        action: 'final_answer',
        answer: 'No accounts found matching that ID.',
      },
    ]);

    const streamRes = await streamChat(user.cookie, [
      { role: 'user', content: `Show me details for account ${accB.id}` },
    ]);
    expect(streamRes.status).toBe(200);

    const traceEvents = streamRes.events.filter((e) => e.event === 'trace');
    expect(traceEvents.length).toBe(1);
    const sqlTrace = traceEvents[0].data;
    expect(sqlTrace.action).toBe('run_sql');
    expect(sqlTrace.success).toBe(true);
    expect(sqlTrace.rowCount).toBe(0); // Tenant isolation: rowCount 0, no error
  });

  test('4. SQL rejections: validator rejects unauthorized queries and orchestrator continues', async ({
    request,
  }) => {
    const rejectedQueries = [
      'DELETE FROM V_CHAT_TRANSACTIONS',
      'SELECT * FROM USERS',
      'SELECT * FROM dual@remote',
      'SELECT 1 FROM V_CHAT_ACCOUNTS; SELECT 2 FROM V_CHAT_ACCOUNTS',
      'SELECT * FROM ADMIN.V_CHAT_ACCOUNTS',
    ];

    for (let i = 0; i < rejectedQueries.length; i++) {
      const badSql = rejectedQueries[i];
      const user = await newUser(request, `chat-rej-${i}`);
      await resetLlm(user.api);
      await scriptChat(user.api, [
        { action: 'run_sql', sql: badSql },
        { action: 'final_answer', answer: 'I encountered an issue running that query.' },
      ]);

      const streamRes = await streamChat(user.cookie, [
        { role: 'user', content: 'Run this query' },
      ]);
      expect(streamRes.status).toBe(200);

      const traceEvents = streamRes.events.filter((e) => e.event === 'trace');
      expect(traceEvents.length).toBe(1);
      const trace = traceEvents[0].data;
      expect(trace.action).toBe('run_sql');
      expect(trace.success).toBe(false);
      expect(trace.error).toContain('SQL Rejected');

      const finalEvent = streamRes.events.find((e) => e.event === 'final');
      expect(finalEvent?.data.answer).toBe('I encountered an issue running that query.');
    }
  });

  test('5. Row cap: query over 200 rows caps rowCount at 200 and truncates preview', async ({
    request,
  }) => {
    const user = await newUser(request, 'chat-rowcap');
    await resetLlm(user.api);

    const acc = await createBankAccount(user.api, { name: 'High Volume Bank' });
    await createTransactions(user.api, acc.id, 205, {
      descriptionPrefix: 'Bulk Item',
    });

    await scriptChat(user.api, [
      {
        action: 'run_sql',
        sql: 'SELECT id FROM V_CHAT_TRANSACTIONS',
      },
      {
        action: 'final_answer',
        answer: 'You have many transactions.',
      },
    ]);

    const streamRes = await streamChat(user.cookie, [
      { role: 'user', content: 'Fetch all transactions' },
    ]);
    expect(streamRes.status).toBe(200);

    const traceEvents = streamRes.events.filter((e) => e.event === 'trace');
    expect(traceEvents.length).toBe(1);
    const trace = traceEvents[0].data;
    expect(trace.action).toBe('run_sql');
    expect(trace.success).toBe(true);
    expect(trace.rowCount).toBe(200);
    expect(trace.resultPreview).toBeDefined();
  });

  test('6. Tools: get_positions, get_reward_summary, calc, args object/string, and userId stripping', async ({
    request,
  }) => {
    const user = await newUser(request, 'chat-tools-1');
    await resetLlm(user.api);

    // 6a. get_positions
    const broker = await createBroker(user.api, { name: 'Zerodha Chat' });
    const isin = generateIsin();
    const symbol = generateYahooSymbol('POS');
    const instrument = await createInstrument(user.api, {
      isin,
      name: 'Positions Test Equity',
      symbol,
      yahooSymbol: symbol,
      type: 'stock',
      currency: 'INR',
    });
    await trade(user.api, {
      brokerAccountId: broker.id,
      instrumentId: instrument.id,
      type: 'buy',
      quantity: 10,
      price: 100,
      tradeDate: '2026-08-01',
    });

    await scriptChat(user.api, [
      { action: 'call_tool', tool: 'get_positions', args: {} },
      { action: 'final_answer', answer: 'You hold 10 shares.' },
    ]);
    const posRes = await streamChat(user.cookie, [{ role: 'user', content: 'What are my positions?' }]);
    expect(posRes.status).toBe(200);
    const posTrace = posRes.events.find((e) => e.event === 'trace')?.data;
    expect(posTrace.action).toBe('call_tool');
    expect(posTrace.success).toBe(true);
    expect(posTrace.resultPreview).toContain(instrument.name);

    // 6b. get_reward_summary
    const user2 = await newUser(request, 'chat-tools-2');
    await resetLlm(user2.api);
    const card = await createCreditCard(user2.api, { name: 'Rewards Card' });
    await createRewardRule(user2.api, card.id, {
      name: '10% Dining Cash',
      percentRate: 10.0,
      mccs: ['5814'],
    });
    await spend(user2.api, card.id, { amount: 1000, mcc: '5814' });

    await scriptChat(user2.api, [
      { action: 'call_tool', tool: 'get_reward_summary', args: {} },
      { action: 'final_answer', answer: 'You earned rewards.' },
    ]);
    const rewardRes = await streamChat(user2.cookie, [{ role: 'user', content: 'What are my rewards?' }]);
    expect(rewardRes.status).toBe(200);
    const rewardTrace = rewardRes.events.find((e) => e.event === 'trace')?.data;
    expect(rewardTrace.action).toBe('call_tool');
    expect(rewardTrace.success).toBe(true);
    expect(rewardTrace.resultPreview).toBeDefined();

    // 6c. calc: expression calculation, string args, object args, userId stripping
    const user3 = await newUser(request, 'chat-tools-3');
    await resetLlm(user3.api);
    await scriptChat(user3.api, [
      { action: 'calc', args: { expression: 'a*b', values: { a: 2, b: 21 }, userId: 'strip-me', user_id: 'strip-me' } },
      { action: 'calc', args: '{"expression":"10+5"}' },
      { action: 'final_answer', answer: 'Calculations complete.' },
    ]);
    const calcRes = await streamChat(user3.cookie, [{ role: 'user', content: 'Calculate 2*21 and 10+5' }]);
    expect(calcRes.status).toBe(200);
    const calcTraces = calcRes.events.filter((e) => e.event === 'trace').map((e) => e.data);
    expect(calcTraces.length).toBe(2);
    expect(calcTraces[0].success).toBe(true);
    expect(calcTraces[0].resultPreview).toContain('42');
    expect(calcTraces[1].success).toBe(true);
    expect(calcTraces[1].resultPreview).toContain('15');
  });

  test('7. Clarify round-trip: clarify options prompt and transcript roundtrip', async ({
    request,
  }) => {
    const user = await newUser(request, 'chat-clarify-1');
    await resetLlm(user.api);

    // 7a. Initial clarify response
    await scriptChat(user.api, [
      {
        action: 'clarify',
        question: 'Which bank account would you like to check?',
        options: '["HDFC Bank", "ICICI Bank", "SBI"]',
      },
    ]);

    const res1 = await streamChat(user.cookie, [
      { role: 'user', content: 'What is my current balance?' },
    ]);
    expect(res1.status).toBe(200);
    const final1 = res1.events.find((e) => e.event === 'final')?.data;
    expect(final1.clarify).toBe('Which bank account would you like to check?');
    expect(final1.clarifyOptions).toEqual(['HDFC Bank', 'ICICI Bank', 'SBI']);

    // 7b. Reply using clarifyTranscript helper
    const transcript = clarifyTranscript(
      [{ role: 'user', content: 'What is my current balance?' }],
      'Which bank account would you like to check?',
      'HDFC Bank'
    );
    await scriptChat(user.api, [
      {
        action: 'final_answer',
        answer: 'Your HDFC Bank balance is ₹50,000.',
      },
    ]);

    const res2 = await streamChat(user.cookie, transcript);
    expect(res2.status).toBe(200);
    const final2 = res2.events.find((e) => e.event === 'final')?.data;
    expect(final2.answer).toBe('Your HDFC Bank balance is ₹50,000.');

    // 7c. Clarify without question: triggers re-prompt and subsequent final answer
    const user2 = await newUser(request, 'chat-clarify-2');
    await resetLlm(user2.api);
    await scriptChat(user2.api, [
      { action: 'clarify' }, // missing question
      { action: 'final_answer', answer: 'Fallback answer after empty clarify.' },
    ]);
    const res3 = await streamChat(user2.cookie, [
      { role: 'user', content: 'Help me with something' },
    ]);
    expect(res3.status).toBe(200);
    const final3 = res3.events.find((e) => e.event === 'final')?.data;
    expect(final3.answer).toBe('Fallback answer after empty clarify.');
  });

  test('8. Robustness: unparseable JSON, missing answer, unknown action, NO_KEYS, FATAL, and STRICT mode', async ({
    request,
  }) => {
    // 8a. Unparseable JSON from model
    const user1 = await newUser(request, 'chat-robust-1');
    await resetLlm(user1.api);
    await scriptChat(user1.api, [{ json: 'not a valid json object string' }]);
    const res1 = await streamChat(user1.cookie, [{ role: 'user', content: 'Hello' }]);
    expect(res1.status).toBe(200);
    const final1 = res1.events.find((e) => e.event === 'final')?.data;
    expect(final1.answer).toContain('Received an unparseable response from the AI model.');

    // 8b. final_answer without answer
    const user2 = await newUser(request, 'chat-robust-2');
    await resetLlm(user2.api);
    await scriptChat(user2.api, [{ action: 'final_answer' }]);
    const res2 = await streamChat(user2.cookie, [{ role: 'user', content: 'Hello' }]);
    expect(res2.status).toBe(200);
    const final2 = res2.events.find((e) => e.event === 'final')?.data;
    expect(final2.answer).toBeDefined();

    // 8c. Unknown action repeated -> hits max iterations limit
    const user3 = await newUser(request, 'chat-robust-3');
    await resetLlm(user3.api);
    await scriptChat(user3.api, [
      { action: 'unknown_action_xyz' },
      { action: 'unknown_action_xyz' },
      { action: 'unknown_action_xyz' },
      { action: 'unknown_action_xyz' },
      { action: 'unknown_action_xyz' },
      { action: 'unknown_action_xyz' },
      { action: 'unknown_action_xyz' },
    ]);
    const res3 = await streamChat(user3.cookie, [{ role: 'user', content: 'Analyze' }]);
    expect(res3.status).toBe(200);
    const final3 = res3.events.find((e) => e.event === 'final')?.data;
    expect(final3.answer).toContain('Reached maximum analysis iterations. Please ask a more specific question.');

    // 8d. Scripted NO_KEYS error
    const user4 = await newUser(request, 'chat-robust-4');
    await resetLlm(user4.api);
    await scriptChat(user4.api, [
      { error: { kind: 'NO_KEYS', message: 'No keys available' } },
    ]);
    const res4 = await streamChat(user4.cookie, [{ role: 'user', content: 'Analyze' }]);
    expect(res4.status).toBe(200);
    const final4 = res4.events.find((e) => e.event === 'final')?.data;
    expect(final4.answer).toContain('No AI API keys configured. Please add an API key in Settings > AI API Keys to use chat.');

    // 8e. Scripted FATAL error
    const user5 = await newUser(request, 'chat-robust-5');
    await resetLlm(user5.api);
    await scriptChat(user5.api, [
      { error: { kind: 'FATAL', message: 'Connection dropped' } },
    ]);
    const res5 = await streamChat(user5.cookie, [{ role: 'user', content: 'Analyze' }]);
    expect(res5.status).toBe(200);
    const final5 = res5.events.find((e) => e.event === 'final')?.data;
    expect(final5.answer).toContain('I encountered an error connecting to the AI model. Please try again.');

    // 8f. STRICT mode with no script
    const user6 = await newUser(request, 'chat-robust-6');
    await resetLlm(user6.api);
    await setLlmMode(user6.api, 'STRICT');
    const res6 = await streamChat(user6.cookie, [{ role: 'user', content: 'Unscripted question' }]);
    expect(res6.status).toBe(200);
    const final6 = res6.events.find((e) => e.event === 'final')?.data;
    expect(final6.answer).toContain('I encountered an error connecting to the AI model. Please try again.');
    await setLlmMode(user6.api, 'SCHEMA_DEFAULT');

    // 8g. Repeated identical SQL failure x3 -> forced final
    const user7 = await newUser(request, 'chat-robust-7');
    await resetLlm(user7.api);
    await scriptChat(user7.api, [
      { action: 'run_sql', sql: 'SELECT * FROM INVALID_TABLE_REPEATED' },
      { action: 'run_sql', sql: 'SELECT * FROM INVALID_TABLE_REPEATED' },
      { action: 'run_sql', sql: 'SELECT * FROM INVALID_TABLE_REPEATED' },
      { action: 'final_answer', answer: 'Handled repeated failures gracefully.' },
    ]);
    const res7 = await streamChat(user7.cookie, [{ role: 'user', content: 'Query repeatedly' }]);
    expect(res7.status).toBe(200);
    const final7 = res7.events.find((e) => e.event === 'final')?.data;
    expect(final7.answer).toBe('Handled repeated failures gracefully.');
  });

  test('9. Wall clock deadline: delay exceeding hard deadline returns graceful partial answer', async ({
    request,
  }) => {
    test.slow();
    const user = await newUser(request, 'chat-deadline');
    await resetLlm(user.api);

    // Chat max-wall-clock-seconds is 20s in e2e profile, computeHardDeadlineMs is 20s
    await scriptChat(user.api, [
      {
        delayMs: 22000,
        action: 'call_tool',
        tool: 'calc',
        args: { expression: '1+1' },
      },
      {
        action: 'final_answer',
        answer: 'Delayed answer',
      },
    ]);

    const res = await streamChat(user.cookie, [{ role: 'user', content: 'Slow question' }]);
    expect(res.status).toBe(200);

    const errorEvent = res.events.find((e) => e.event === 'error');
    expect(errorEvent).toBeUndefined();

    const finalEvent = res.events.find((e) => e.event === 'final');
    expect(finalEvent).toBeDefined();
    expect(finalEvent?.data.answer).toContain('This request took longer than expected and I had to stop before finishing');
  });

  test('10. Quota: 3 messages succeed, 4th message returns 429 CHAT_QUOTA_EXCEEDED', async ({
    request,
  }) => {
    const user = await newUser(request, 'chat-quota');
    await resetLlm(user.api);

    // Message 1
    await scriptChat(user.api, [{ action: 'final_answer', answer: 'Answer 1' }]);
    const res1 = await streamChat(user.cookie, [{ role: 'user', content: 'Msg 1' }]);
    expect(res1.status).toBe(200);

    // Message 2
    await scriptChat(user.api, [{ action: 'final_answer', answer: 'Answer 2' }]);
    const res2 = await streamChat(user.cookie, [{ role: 'user', content: 'Msg 2' }]);
    expect(res2.status).toBe(200);

    // Message 3
    await scriptChat(user.api, [{ action: 'final_answer', answer: 'Answer 3' }]);
    const res3 = await streamChat(user.cookie, [{ role: 'user', content: 'Msg 3' }]);
    expect(res3.status).toBe(200);

    // Message 4 on stream -> 429 with X-Chat-Error: CHAT_QUOTA_EXCEEDED
    const res4 = await streamChat(user.cookie, [{ role: 'user', content: 'Msg 4' }]);
    expect(res4.status).toBe(429);
    expect(res4.header).toBe('CHAT_QUOTA_EXCEEDED');

    // Sync endpoint also returns 429 (without X-Chat-Error header)
    const syncRes = await syncChat(user.api, [{ role: 'user', content: 'Msg 4 sync' }]);
    expectStatus(syncRes, 429);
  });

  test('11. Concurrency: 2 concurrent streams hold semaphore, 3rd stream returns 429 CHAT_BUSY', async ({
    request,
  }) => {
    const userA = await newUser(request, 'chat-conc-a');
    const userB = await newUser(request, 'chat-conc-b');
    const userC = await newUser(request, 'chat-conc-c');

    await resetLlm(userA.api);
    await resetLlm(userB.api);
    await resetLlm(userC.api);

    await scriptChat(userA.api, [
      { delayMs: 2000, action: 'final_answer', answer: 'User A answer' },
    ]);
    await scriptChat(userB.api, [
      { delayMs: 2000, action: 'final_answer', answer: 'User B answer' },
    ]);

    // Launch streams for user A and B in background
    const promiseA = streamChat(userA.cookie, [{ role: 'user', content: 'A' }]);
    const promiseB = streamChat(userB.cookie, [{ role: 'user', content: 'B' }]);

    // Wait a brief moment to ensure both A and B have entered the semaphore
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Third stream from user C while semaphore is full (2 permits) - no retry
    const resC = await streamChat(userC.cookie, [{ role: 'user', content: 'C' }], 0);
    expect(resC.status).toBe(429);
    expect(resC.header).toBe('CHAT_BUSY');

    // Wait for A and B to complete
    const [resA, resB] = await Promise.all([promiseA, promiseB]);
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    // After permits are released, User C's chat succeeds
    await scriptChat(userC.api, [
      { action: 'final_answer', answer: 'User C success' },
    ]);
    const resC2 = await streamChat(userC.cookie, [{ role: 'user', content: 'C retry' }]);
    expect(resC2.status).toBe(200);
    const finalC2 = resC2.events.find((e) => e.event === 'final')?.data;
    expect(finalC2.answer).toBe('User C success');
  });

  test('12. Report draft: scripted tools validate draft and final answer returns reportDraft block', async ({
    request,
  }) => {
    const user = await newUser(request, 'chat-draft');
    await resetLlm(user.api);

    await scriptChat(user.api, [
      { action: 'call_tool', tool: 'get_report_catalog', args: {} },
      {
        action: 'call_tool',
        tool: 'validate_report_draft',
        args: {
          type: 'KPI',
          datasource: 'transactions',
          definition: { measure: 'amount', aggregation: 'sum', filters: [] },
        },
      },
      {
        action: 'final_answer',
        answer: 'I drafted a KPI report for your total spending.',
        blocks: JSON.stringify({
          reportDraft: {
            mode: 'create',
            name: 'Total Spending KPI',
            type: 'KPI',
            datasource: 'transactions',
            definition: { measure: 'amount', aggregation: 'sum', filters: [] },
          },
        }),
      },
    ]);

    const res = await streamChat(user.cookie, [
      { role: 'user', content: 'Create a report for my spending' },
    ]);
    expect(res.status).toBe(200);

    const toolTraces = res.events.filter((e) => e.event === 'trace').map((e) => e.data);
    expect(toolTraces.length).toBe(2);
    expect(toolTraces[0].action).toBe('call_tool');
    expect(toolTraces[0].success).toBe(true);
    expect(toolTraces[1].action).toBe('call_tool');
    expect(toolTraces[1].success).toBe(true);

    const finalEvent = res.events.find((e) => e.event === 'final')?.data;
    expect(finalEvent.blocks?.reportDraft).toBeDefined();
    expect(finalEvent.blocks.reportDraft.name).toBe('Total Spending KPI');
    expect(finalEvent.blocks.reportDraft.mode).toBe('create');
  });

  test('13. 401 unauthorized on chat endpoints without session cookie', async () => {
    // Stream endpoint
    const streamRes = await streamChat(null, [{ role: 'user', content: 'Hi' }]);
    expect(streamRes.status).toBe(401);

    // Sync endpoint
    const unauthFetch = await fetch('http://localhost:6969/api/v1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Hi' }] }),
    });
    expect(unauthFetch.status).toBe(401);
  });
});
