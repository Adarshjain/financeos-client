import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { LlmRoutingGroupDto, RoutingOptionDto } from '@/lib/api/types';

import { RoutingGroupCard } from '../RoutingGroupCard';

const providers = [
  { id: 'gemini', name: 'Gemini', hasKey: false },
  { id: 'openrouter', name: 'OpenRouter', hasKey: true },
];

const groupDto: LlmRoutingGroupDto = {
  group: 'default',
  displayName: 'Everything else',
  description: 'Reading emails',
  usingDefaults: false,
  entries: [
    {
      position: 1,
      optionId: 'custom',
      optionLabel: 'anthropic/claude-haiku-5.5',
      provider: 'openrouter',
      providerName: 'OpenRouter',
      model: 'anthropic/claude-haiku-5.5',
      hasKey: true,
      custom: true,
    },
    {
      position: 2,
      optionId: 'gemini-chain',
      optionLabel: 'Gemini (full chain)',
      provider: 'gemini',
      providerName: 'Gemini',
      model: null,
      hasKey: false,
      custom: false,
    },
  ],
};

const routingOptions: RoutingOptionDto[] = [
  {
    id: 'gemini-chain',
    label: 'Gemini (full chain)',
    provider: 'gemini',
    providerName: 'Gemini',
    model: null,
    notes: null,
    free: true,
    trainsOnData: 'yes',
    available: false,
  },
];

function renderCard(overrides: Partial<React.ComponentProps<typeof RoutingGroupCard>> = {}) {
  const handlers = {
    onStartCustomizing: vi.fn(),
    onCancelEditing: vi.fn(),
    onSaveRouting: vi.fn(),
    onResetRouting: vi.fn(),
    onMoveDraftItem: vi.fn(),
    onRemoveDraftItem: vi.fn(),
    onAddCustomModel: vi.fn().mockResolvedValue(true),
  };
  render(
    <RoutingGroupCard
      groupType="default"
      groupDto={groupDto}
      editing={false}
      draft={[]}
      saving={false}
      resetting={false}
      testing={false}
      addError={null}
      health={[]}
      routingOptions={routingOptions}
      providers={providers}
      {...handlers}
      {...overrides}
    />
  );
  return handlers;
}

const draft = [
  { optionId: 'custom', provider: 'openrouter', model: 'anthropic/claude-haiku-5.5' },
  { optionId: 'gemini-chain' },
];

describe('RoutingGroupCard with custom model rows', () => {
  it('shows a typed model by its id with the provider underneath, and menu rows as before', () => {
    renderCard();
    expect(screen.getByText('anthropic/claude-haiku-5.5')).toBeInTheDocument();
    expect(screen.getByText('OpenRouter')).toBeInTheDocument();
    expect(screen.getByText('Gemini (full chain)')).toBeInTheDocument();
    expect(screen.getByText('Not configured')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('in edit mode only custom rows get a remove control, which reports the row index', () => {
    const handlers = renderCard({ editing: true, draft });
    const remove = screen.getByRole('button', { name: 'Remove anthropic/claude-haiku-5.5' });
    expect(screen.getAllByRole('button', { name: /^Remove / })).toHaveLength(1);

    fireEvent.click(remove);
    expect(handlers.onRemoveDraftItem).toHaveBeenCalledWith(0);
  });

  it('probes the typed model with the first keyed provider and clears the field once added', async () => {
    const handlers = renderCard({ editing: true, draft });
    const field = screen.getByLabelText('Model id');
    fireEvent.change(field, { target: { value: '  z-ai/glm-5.3-flashx ' } });
    fireEvent.click(screen.getByRole('button', { name: /Test & add/ }));

    expect(handlers.onAddCustomModel).toHaveBeenCalledWith({
      provider: 'openrouter',
      model: 'z-ai/glm-5.3-flashx',
      reasoningEffort: null,
      structuredOutput: null,
      maxOutputTokens: null,
      providerPin: null,
    });
    await waitFor(() => expect(field).toHaveValue(''));
  });

  it('keeps the typed model when the probe refused it and shows the reason', async () => {
    const handlers = renderCard({ editing: true, draft, addError: 'Model was not found on OpenRouter.' });
    handlers.onAddCustomModel.mockResolvedValue(false);
    const field = screen.getByLabelText('Model id');
    fireEvent.change(field, { target: { value: 'nope/nope' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    expect(handlers.onAddCustomModel).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(field).toHaveValue('nope/nope'));
    expect(screen.getByText('Model was not found on OpenRouter.')).toBeInTheDocument();
  });

  it('sends the extra knobs when they are filled in', () => {
    const handlers = renderCard({ editing: true, draft });
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.change(screen.getByLabelText('Model id'), { target: { value: 'foo/bar' } });
    fireEvent.change(screen.getByLabelText('Max output tokens'), { target: { value: '2048' } });
    fireEvent.change(screen.getByLabelText('Provider pin'), { target: { value: ' anthropic ' } });
    fireEvent.click(screen.getByRole('button', { name: /Test & add/ }));

    expect(handlers.onAddCustomModel).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'foo/bar', maxOutputTokens: 2048, providerPin: 'anthropic' })
    );
  });

  it('disables Test & add while a probe runs and while the model field is empty', () => {
    renderCard({ editing: true, draft, testing: true });
    expect(screen.getByRole('button', { name: /Test & add/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('only hints when no provider has a key yet', () => {
    renderCard({
      editing: true,
      draft,
      providers: providers.map((p) => ({ ...p, hasKey: false })),
    });
    expect(screen.getByText('Add an API key to type in a model of your own.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Model id')).not.toBeInTheDocument();
  });

  it('labels a custom draft row with its model and provider and a menu row with its option label', () => {
    renderCard({ editing: true, draft });
    const rows = screen.getAllByText(/^#\d$/).map((n) => n.closest('div.flex.items-center') as HTMLElement);
    expect(within(rows[0]).getByText('anthropic/claude-haiku-5.5')).toBeInTheDocument();
    expect(within(rows[0]).getByText('OpenRouter')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Gemini (full chain)')).toBeInTheDocument();
  });
});
