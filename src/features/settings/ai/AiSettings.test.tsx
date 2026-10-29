import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  LlmBucketHealthDto,
  LlmKeyDto,
  LlmRoutingDto,
  LlmRoutingGroupDto,
  RoutingOptionDto,
  Schemas,
} from '@/lib/api/types';
import { formatDate } from '@/lib/format';
import { keys as queryKeys } from '@/lib/query/keys';
import { pinClock } from '@/test/pinClock';

import { AiSettings } from './AiSettings';

pinClock();

const routerRefresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ refresh: routerRefresh }),
}));

const get = vi.fn();
const post = vi.fn();
const put = vi.fn();
const patch = vi.fn();
const del = vi.fn();
// The actions behind the hooks run `serverApi`; the tests drive it through the same mock shape.
vi.mock('@/lib/api/server', () => ({ serverApi: {
      GET: (...a: unknown[]) => get(...a),
      POST: (...a: unknown[]) => post(...a),
      PUT: (...a: unknown[]) => put(...a),
      PATCH: (...a: unknown[]) => patch(...a),
      DELETE: (...a: unknown[]) => del(...a),
    } }));

const showToast = vi.fn();
vi.mock('@/components/ds', async () => {
  const actual = await vi.importActual<typeof import('@/components/ds')>('@/components/ds');
  return { ...actual, showToast: (...a: unknown[]) => showToast(...a) };
});

// Relative to pinClock's instant: the fixtures are built at import, before the clock is pinned.
const iso = (daysAgo: number) => new Date(Date.parse('2026-10-29T06:00:00Z') - daysAgo * 86_400_000).toISOString();

const gemini1: LlmKeyDto = {
  id: 'g1', createdAt: iso(30), keyLast4: 'k3Qa', label: 'Personal', lastUsedAt: iso(0), position: 1, provider: 'gemini', status: 'ACTIVE',
};
const gemini2: LlmKeyDto = {
  id: 'g2', createdAt: iso(30), keyLast4: '7Hd2', label: 'Backup', lastUsedAt: iso(3), position: 2, provider: 'gemini', status: 'ACTIVE',
};
const orKey: LlmKeyDto = {
  id: 'o1', createdAt: iso(30), keyLast4: '9f2c', label: null, lastUsedAt: null, position: 1, provider: 'openrouter', status: 'INVALID',
};

const entry = (over: Partial<Schemas['RoutingEntryDto']>): Schemas['RoutingEntryDto'] => ({
  position: 1, optionId: 'gem', optionLabel: 'Gemini 3.8 Flash', provider: 'gemini', providerName: 'Gemini', hasKey: true, custom: false, ...over,
});

const chat: LlmRoutingGroupDto = {
  group: 'chat',
  displayName: 'Chat & reports',
  description: 'Answering your questions',
  usingDefaults: false,
  entries: [
    entry({ position: 1 }),
    entry({
      position: 2, optionId: 'custom', optionLabel: 'anthropic/claude-haiku-5.5', provider: 'openrouter', providerName: 'OpenRouter',
      model: 'anthropic/claude-haiku-5.5', custom: true,
    }),
  ],
};
const dflt: LlmRoutingGroupDto = {
  group: 'default',
  displayName: 'Categorising',
  description: 'Everything else',
  usingDefaults: true,
  entries: [entry({ position: 1, optionLabel: 'Gemini 3.5 Flash Lite' }), entry({ position: 2, optionId: 'groq', optionLabel: 'Groq Llama', provider: 'groq', providerName: 'Groq', hasKey: false })],
};
const routing = { chat, default: dflt } as LlmRoutingDto;

const options = [
  { id: 'gem', label: 'Gemini 3.8 Flash', provider: 'gemini', providerName: 'Gemini', available: true, free: true, trainsOnData: 'no' },
  { id: 'groq', label: 'Groq Llama', provider: 'groq', providerName: 'Groq', available: false, free: true, trainsOnData: 'no' },
] as RoutingOptionDto[];

const health: LlmBucketHealthDto[] = [
  { consecutiveFailures: 0, inCooldown: false, keyLast4: 'k3Qa', model: 'gem', modelLabel: 'Gemini 3.8 Flash', provider: 'gemini', providerName: 'Gemini' },
  {
    consecutiveFailures: 3, inCooldown: true, cooldownUntil: '2026-10-20T08:50:00Z', keyLast4: '9f2c',
    model: 'anthropic/claude-haiku-5.5', modelLabel: 'Claude Haiku 5.5', provider: 'openrouter', providerName: 'OpenRouter',
  },
];

const catalog = [
  { id: 'gemini', name: 'Gemini', models: [{ free: true, trainsOnData: 'yes' }] },
  { id: 'groq', name: 'Groq', models: [{ free: false, trainsOnData: 'no' }] },
  { id: 'openrouter', name: 'OpenRouter', models: [{ free: false, trainsOnData: 'no' }] },
];

let data: { keys: LlmKeyDto[]; routing: LlmRoutingDto };

function setup(keys: LlmKeyDto[] = [gemini1, gemini2, orKey]) {
  data = { keys, routing };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  client.setQueryData(queryKeys.settings.llmKeys(), keys);
  client.setQueryData(queryKeys.settings.llmCatalog(), catalog);
  client.setQueryData(queryKeys.settings.llmRoutingOptions(), options);
  client.setQueryData(queryKeys.settings.llmRouting(), routing);
  client.setQueryData(queryKeys.settings.llmHealth(), health);
  return { client, ...render(<QueryClientProvider client={client}><AiSettings /></QueryClientProvider>) };
}

function row(text: string) {
  // DataTable rows and the phone stack share cells; find the row element holding this provider text.
  return screen.getAllByText(text)[0].closest('[role="row"], tr, li, div[class*="grid"]') as HTMLElement;
}

async function openMenuFor(name: string) {
  fireEvent.pointerDown(screen.getByRole('button', { name }), { button: 0 });
  return screen.findAllByRole('menuitem');
}

beforeEach(() => {
  [get, post, put, patch, del, showToast].forEach((m) => m.mockReset());
  get.mockImplementation(async (url: string) => {
    const byUrl: Record<string, unknown> = {
      '/api/v1/llm-keys': data?.keys ?? [],
      '/api/v1/llm/catalog': catalog,
      '/api/v1/llm/routing-options': options,
      '/api/v1/llm/routing': routing,
      '/api/v1/llm/health': health,
    };
    return { data: byUrl[url] ?? [] };
  });
});

describe('Your keys', () => {
  it('lists one row per key in provider order with a Not set row for keyless providers', () => {
    setup();
    const names = screen.getAllByText(/^(Gemini|Groq|OpenRouter)( · #\d.*)?$/).map((n) => n.textContent);
    expect(names).toContain('Gemini · #1 Personal');
    expect(names).toContain('Gemini · #2 Backup');
    expect(names).toContain('Groq');
    expect(names).toContain('OpenRouter');
    expect(names.indexOf('Gemini · #2 Backup')).toBeLessThan(names.indexOf('Groq'));
    expect(screen.getAllByText('Not set')).toHaveLength(1);
    expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Invalid').length).toBeGreaterThanOrEqual(1);
  });

  it('shows the masked key and last-used wording', () => {
    setup();
    expect(screen.getAllByText('•••• k3Qa').length).toBeGreaterThan(0);
    expect(screen.getAllByText('today').length).toBeGreaterThan(0);
    expect(screen.getAllByText(formatDate(iso(3), 'relative', { inline: true })).length).toBeGreaterThan(0);
    // A key never used reads as a dash on desktop.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('the menu of a provider with two keys has Test, Move up, Move down and Delete', async () => {
    setup();
    const items = await openMenuFor('Key options for Gemini · #1 Personal');
    expect(items.map((i) => i.textContent)).toEqual(['Test key', 'Move up', 'Move down', 'Delete key']);
    // First of two: Move up disabled; Move down enabled.
    expect(items[1]).toHaveAttribute('aria-disabled', 'true');
    expect(items[2]).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('a lone key has no move items', async () => {
    setup();
    const items = await openMenuFor('Key options for OpenRouter');
    expect(items.map((i) => i.textContent)).toEqual(['Test key', 'Delete key']);
  });

  it('Move down PATCHes the position and writes the returned list to the cache', async () => {
    patch.mockResolvedValue({ data: [{ ...gemini2, position: 1 }, { ...gemini1, position: 2 }] });
    const { client } = setup();
    const items = await openMenuFor('Key options for Gemini · #1 Personal');
    fireEvent.click(items[2]);
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/api/v1/llm-keys/{id}/position', {
        params: { path: { id: 'g1' } },
        body: { position: 2 },
      })
    );
    await waitFor(() => {
      const cached = client.getQueryData<LlmKeyDto[]>(queryKeys.settings.llmKeys())!;
      expect(cached.find((k) => k.id === 'g2')?.position).toBe(1);
      expect(cached.find((k) => k.id === 'g1')?.position).toBe(2);
    });
  });

  it('Test key toasts Key verified on success', async () => {
    post.mockResolvedValue({ data: { ok: true } });
    setup();
    const items = await openMenuFor('Key options for Gemini · #1 Personal');
    fireEvent.click(items[0]);
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Key verified', { tone: 'success' }));
    expect(post).toHaveBeenCalledWith('/api/v1/llm-keys/{id}/test', { params: { path: { id: 'g1' } }, body: { model: undefined } });
  });

  it('Test key toasts the failure with its error', async () => {
    post.mockResolvedValue({ data: { ok: false, error: 'Key rejected' } });
    setup();
    const items = await openMenuFor('Key options for OpenRouter');
    fireEvent.click(items[0]);
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Couldn't verify the key: Key rejected", { tone: 'danger' }));
  });

  it('Test key keeps the row busy until the call returns', async () => {
    let resolve!: (v: unknown) => void;
    post.mockReturnValue(new Promise((r) => (resolve = r)));
    setup();
    const items = await openMenuFor('Key options for Gemini · #1 Personal');
    fireEvent.click(items[0]);
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(row('Gemini · #1 Personal').className + (row('Gemini · #1 Personal').parentElement?.className ?? '')).toMatch(/opacity|pointer-events/);
    resolve({ data: { ok: true } });
    await waitFor(() => expect(showToast).toHaveBeenCalled());
  });

  it('Delete key confirms in a dialog with the key name and deletes on confirm', async () => {
    del.mockResolvedValue({});
    setup();
    const items = await openMenuFor('Key options for Gemini · #1 Personal');
    fireEvent.click(items[3]);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Delete API key?')).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Personal (•••• k3Qa) goes. Your other keys stay. This can't be undone.");
    expect(del).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(del).toHaveBeenCalledWith('/api/v1/llm-keys/{id}', { params: { path: { id: 'g1' } } }));
  });

  it('Cancel in the delete dialog deletes nothing', async () => {
    setup();
    const items = await openMenuFor('Key options for OpenRouter');
    fireEvent.click(items[1]);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent("openrouter key (•••• 9f2c) goes. Your other keys stay. This can't be undone.");
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(del).not.toHaveBeenCalled();
  });

  it('a failed delete shows the error banner', async () => {
    del.mockRejectedValue(new Error('boom'));
    setup();
    const items = await openMenuFor('Key options for OpenRouter');
    fireEvent.click(items[1]);
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

describe('Add key dialog', () => {
  it('the Add link on a Not set row presets that provider', async () => {
    setup();
    fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[0]);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getAllByText('Add key')).toHaveLength(2);
    expect(dialog).toHaveTextContent('Groq');
    expect(within(dialog).getByRole('link', { name: 'Groq' })).toHaveAttribute('href', 'https://console.groq.com/keys');
  });

  it('the header link opens with Gemini and shows the disclosure when free models may train on data', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Add key' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Gemini');
    expect(dialog).toHaveTextContent('Training & privacy disclosure');
    expect(within(dialog).getByRole('link', { name: 'Gemini' })).toHaveAttribute('href', 'https://aistudio.google.com/app/apikey');
  });

  it('no disclosure when the provider has no free tier that trains', async () => {
    setup();
    fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[0]);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).not.toHaveTextContent('Training & privacy disclosure');
  });

  it('requires a key: Add key is disabled until one is typed', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Add key' }));
    const dialog = await screen.findByRole('dialog');
    const save = within(dialog).getByRole('button', { name: 'Add key' });
    expect(save).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('API key'), { target: { value: 'AIza-secret' } });
    expect(save).toBeEnabled();
  });

  it('suppresses autofill on the key field', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Add key' }));
    const field = await screen.findByLabelText('API key');
    expect(field).toHaveAttribute('type', 'password');
    expect(field).toHaveAttribute('autocomplete', 'new-password');
    expect(field).toHaveAttribute('data-1p-ignore', 'true');
  });

  it('saves with provider, trimmed key and optional label, then closes', async () => {
    post.mockResolvedValue({ data: { ...gemini1, id: 'new' } });
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Add key' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('API key'), { target: { value: '  AIza-secret ' } });
    fireEvent.change(within(dialog).getByLabelText(/Label/), { target: { value: 'Work' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add key' }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/api/v1/llm-keys', { body: { provider: 'gemini', key: 'AIza-secret', label: 'Work' } })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('an empty label is sent as undefined', async () => {
    post.mockResolvedValue({ data: gemini1 });
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Add key' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('API key'), { target: { value: 'k' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add key' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/v1/llm-keys', { body: { provider: 'gemini', key: 'k', label: undefined } }));
  });

  it('shows the error inline and stays open when saving fails', async () => {
    post.mockRejectedValue(new Error('That key is not valid'));
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Add key' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('API key'), { target: { value: 'bad' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add key' }));
    expect(await within(dialog).findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('Health', () => {
  it('shows Ready, Cooldown until h:mm am/pm, and No key rows', () => {
    setup();
    expect(screen.getByText('Cooldown until 2:20 pm')).toBeInTheDocument();
    expect(screen.getAllByText('Ready')).toHaveLength(1);
    const noKey = screen.getByText('Groq Llama', { selector: 'span' });
    expect(noKey).toBeInTheDocument();
    expect(screen.getByText('No key')).toBeInTheDocument();
  });

  it('prints model label, masked key and provider for custom models', () => {
    setup();
    expect(screen.getByText('Gemini 3.8 Flash', { exact: false, selector: 'span' })).toHaveTextContent('Gemini 3.8 Flash · •••• k3Qa');
    expect(screen.getByText('Claude Haiku 5.5', { exact: false, selector: 'span' })).toHaveTextContent('Claude Haiku 5.5 · •••• 9f2c · OpenRouter');
  });
});

describe('Routing', () => {
  it('shows a row per group with Custom/Default and the ordered list; custom ids are mono', () => {
    setup();
    expect(screen.getByText('Chat & reports')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Categorising')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText(/1 Gemini 3.8 Flash/)).toHaveTextContent('1 Gemini 3.8 Flash · 2 anthropic/claude-haiku-5.5 (OpenRouter)');
    expect(screen.getByText('anthropic/claude-haiku-5.5', { selector: 'span.font-mono' })).toBeInTheDocument();
  });

  it('Reset appears only on a custom group and resets without confirmation', async () => {
    post.mockResolvedValue({ data: { ...chat, usingDefaults: true } });
    setup();
    expect(screen.getAllByRole('button', { name: 'Reset' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Customise' })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/api/v1/llm/routing/{group}/reset', { params: { path: { group: 'chat' } } })
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a failed reset shows the error in the card', async () => {
    post.mockRejectedValue(new Error('nope'));
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

describe('Routing editor dialog', () => {
  async function openChatEditor() {
    fireEvent.click(screen.getAllByRole('button', { name: 'Customise' })[0]);
    return screen.findByRole('dialog');
  }

  it('opens from state with ordered rows, #n and no URL change', async () => {
    const before = window.location.href;
    setup();
    const dialog = await openChatEditor();
    expect(within(dialog).getByText('Chat & reports')).toBeInTheDocument();
    expect(within(dialog).getByText('1')).toBeInTheDocument();
    expect(within(dialog).getByText('2')).toBeInTheDocument();
    expect(window.location.href).toBe(before);
  });

  it('moves rows up and down (ends disabled)', async () => {
    setup();
    const dialog = await openChatEditor();
    expect(within(dialog).getByRole('button', { name: 'Move up Gemini 3.8 Flash' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Move down anthropic/claude-haiku-5.5' })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move down Gemini 3.8 Flash' }));
    const labels = within(dialog).getAllByText(/^(Gemini 3.8 Flash|anthropic\/claude-haiku-5.5)$/).map((n) => n.textContent);
    expect(labels).toEqual(['anthropic/claude-haiku-5.5', 'Gemini 3.8 Flash']);
  });

  it('only custom rows can be removed', async () => {
    setup();
    const dialog = await openChatEditor();
    expect(within(dialog).queryByRole('button', { name: 'Remove Gemini 3.8 Flash' })).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove anthropic/claude-haiku-5.5' }));
    expect(within(dialog).queryByText('2')).toBeNull();
  });

  it('marks options without a key as Not configured', async () => {
    setup();
    fireEvent.click(screen.getAllByRole('button', { name: 'Customise' })[1]);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Not configured/)).toBeInTheDocument();
  });

  it('Save PUTs the draft in order and closes', async () => {
    put.mockResolvedValue({ data: chat });
    setup();
    const dialog = await openChatEditor();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move down Gemini 3.8 Flash' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save routing' }));
    await waitFor(() => expect(put).toHaveBeenCalled());
    const [url, init] = put.mock.calls[0];
    expect(url).toBe('/api/v1/llm/routing/{group}');
    expect(init.params).toEqual({ path: { group: 'chat' } });
    expect(init.body.entries.map((e: { optionId: string }) => e.optionId)).toEqual(['custom', 'gem']);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('Cancel closes without saving', async () => {
    setup();
    const dialog = await openChatEditor();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(put).not.toHaveBeenCalled();
  });

  it('a failed save shows the error in the dialog', async () => {
    put.mockRejectedValue(new Error('bad order'));
    setup();
    const dialog = await openChatEditor();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save routing' }));
    expect(await within(dialog).findByRole('alert')).toBeInTheDocument();
  });

  describe('custom model row', () => {
    it('says to add a key when no provider has one', async () => {
      setup([]);
      const dialog = await openChatEditor();
      expect(within(dialog).getByText('Add an API key to type in a model of your own.')).toBeInTheDocument();
    });

    it('Test & add is disabled until a model id is typed, probes, and appends the row', async () => {
      post.mockResolvedValue({ data: { ok: true } });
      setup();
      const dialog = await openChatEditor();
      const add = within(dialog).getByRole('button', { name: /Test & add/ });
      expect(add).toBeDisabled();
      fireEvent.change(within(dialog).getByLabelText('Model id'), { target: { value: 'meta/llama' } });
      expect(add).toBeEnabled();
      fireEvent.click(add);
      await waitFor(() =>
        expect(post).toHaveBeenCalledWith('/api/v1/llm/routing/test-model', {
          body: expect.objectContaining({ provider: 'gemini', model: 'meta/llama' }),
        })
      );
      expect(await within(dialog).findByText('3')).toBeInTheDocument();
      expect(within(dialog).getByText('meta/llama')).toBeInTheDocument();
    });

    it('Enter in the model id field submits', async () => {
      post.mockResolvedValue({ data: { ok: true } });
      setup();
      const dialog = await openChatEditor();
      const input = within(dialog).getByLabelText('Model id');
      fireEvent.change(input, { target: { value: 'meta/llama' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      await waitFor(() => expect(post).toHaveBeenCalled());
    });

    it('shows the provider refusal and does not add the row', async () => {
      post.mockResolvedValue({ data: { ok: false, error: 'Model not found' } });
      setup();
      const dialog = await openChatEditor();
      fireEvent.change(within(dialog).getByLabelText('Model id'), { target: { value: 'nope' } });
      fireEvent.click(within(dialog).getByRole('button', { name: /Test & add/ }));
      expect(await within(dialog).findByText('Model not found')).toBeInTheDocument();
      expect(within(dialog).queryByText('3')).toBeNull();
    });

    it('refuses a duplicate without probing', async () => {
      setup([gemini1, { ...orKey, status: 'ACTIVE' }]);
      const dialog = await openChatEditor();
      fireEvent.change(within(dialog).getByLabelText('Model id'), { target: { value: 'anthropic/claude-haiku-5.5' } });
      // Provider is the first keyed one (Gemini), so this is not a duplicate; pick OpenRouter first.
      fireEvent.click(within(dialog).getByLabelText('Provider'));
      fireEvent.click(await screen.findByRole('option', { name: 'OpenRouter' }));
      fireEvent.click(within(dialog).getByRole('button', { name: /Test & add/ }));
      expect(await within(dialog).findByText('That model is already in this list.')).toBeInTheDocument();
      expect(post).not.toHaveBeenCalled();
    });

    it('More options reveals the knobs and sends them with the probe; Fewer options hides them', async () => {
      post.mockResolvedValue({ data: { ok: true } });
      setup();
      const dialog = await openChatEditor();
      expect(within(dialog).queryByLabelText('Max output tokens')).toBeNull();
      fireEvent.click(within(dialog).getByRole('button', { name: 'More options' }));
      fireEvent.change(within(dialog).getByLabelText('Max output tokens'), { target: { value: '2048' } });
      fireEvent.change(within(dialog).getByLabelText('Provider pin'), { target: { value: 'anthropic' } });
      fireEvent.change(within(dialog).getByLabelText('Model id'), { target: { value: 'meta/llama' } });
      fireEvent.click(within(dialog).getByRole('button', { name: /Test & add/ }));
      await waitFor(() =>
        expect(post).toHaveBeenCalledWith('/api/v1/llm/routing/test-model', {
          body: expect.objectContaining({ maxOutputTokens: 2048, providerPin: 'anthropic', reasoningEffort: null, structuredOutput: null }),
        })
      );
      fireEvent.click(within(dialog).getByRole('button', { name: 'Fewer options' }));
      expect(within(dialog).queryByLabelText('Max output tokens')).toBeNull();
    });
  });
});
