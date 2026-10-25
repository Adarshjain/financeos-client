import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));

import type { BuiltinParamResponse, BuiltinWidgetResponse, WidgetParams } from '@/lib/dashboards.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { ParamFields } from './ParamFields';
import { useBuiltinParamsForm } from './useBuiltinParamsForm';

const user = userEvent.setup({ pointerEventsCheck: 0 });

const def = (params: BuiltinParamResponse[], key = 'w'): BuiltinWidgetResponse => ({ key, label: 'W', description: '', category: 'c', kind: 'component', minW: 50, params });

function Form({ d, stored, onForm }: { d: BuiltinWidgetResponse; stored?: WidgetParams; onForm: (f: ReturnType<typeof useBuiltinParamsForm>) => void }) {
  const form = useBuiltinParamsForm(d, stored);
  onForm(form);
  return <ParamFields form={form} />;
}

function show(d: BuiltinWidgetResponse, stored?: WidgetParams) {
  let latest!: ReturnType<typeof useBuiltinParamsForm>;
  renderWithQuery(<Form d={d} stored={stored} onForm={(f) => (latest = f)} />);
  return () => latest;
}

const cards = [
  { id: 'c1', name: 'HDFC Regalia Gold', type: 'credit_card', closedOn: null },
  { id: 'c2', name: 'Old card', type: 'credit_card', closedOn: '2020-01-01' },
  { id: 'a1', name: 'Salary', type: 'bank_account', closedOn: null },
];

beforeEach(() => {
  vi.clearAllMocks();
  api.GET.mockImplementation(async (path: string) => {
    if (path === '/api/v1/accounts') return { data: cards };
    if (path === '/api/v1/loans') return { data: { content: [{ id: 'l1', name: 'Home loan' }] } };
    return { data: [] };
  });
});

describe('ParamFields', () => {
  it('renders nothing for a built-in without editable params', () => {
    const { container } = renderWithQuery(<Form d={def([])} onForm={() => undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('an int is a bounded number with its range as help and its error', async () => {
    const form = show(def([{ name: 'days', type: 'int', required: false, min: 1, max: 90, defaultValue: 14 }]));
    const input = screen.getByLabelText('Days ahead');
    expect(input).toHaveValue(14);
    expect(screen.getByText('Between 1 and 90.')).toBeInTheDocument();
    await user.clear(input);
    await user.type(input, '120');
    expect(screen.getByText('At most 90')).toBeInTheDocument();
    expect(form().valid).toBe(false);
  });

  it('an enum is a dropdown of its options', async () => {
    const form = show(def([{ name: 'sortOrder', type: 'enum', required: false, options: ['value', 'change'], defaultValue: 'value' }]));
    await user.click(screen.getByRole('combobox', { name: /Sort order/ }));
    await user.click(await screen.findByRole('option', { name: 'Change' }));
    await waitFor(() => expect(form().params()).toEqual({ sortOrder: 'change' }));
  });

  it('a required card is the account picker over open cards only, and picking it makes the form valid', async () => {
    const form = show(def([{ name: 'accountId', type: 'uuid', ref: 'credit_card', required: true }]));
    expect(form().valid).toBe(false);
    await user.click(screen.getByRole('combobox', { name: /Card/ }));
    expect(await screen.findByRole('option', { name: /HDFC Regalia Gold/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Old card/ })).toBeNull();
    expect(screen.queryByRole('option', { name: /Salary/ })).toBeNull();
    await user.click(screen.getByRole('option', { name: /HDFC Regalia Gold/ }));
    await waitFor(() => expect(form().params()).toEqual({ accountId: 'c1' }));
    expect(form().valid).toBe(true);
  });

  it('an optional card offers "All cards", which leaves it unset', async () => {
    const form = show(def([{ name: 'accountId', type: 'uuid', ref: 'credit_card', required: false }]), { accountId: 'c1' });
    await user.click(await screen.findByRole('combobox', { name: /Card/ }));
    await user.click(await screen.findByRole('option', { name: 'All cards' }));
    await waitFor(() => expect(form().params()).toEqual({}));
  });

  it('an account is any open account; a loan is an active loan', async () => {
    const accountForm = show(def([{ name: 'accountId', type: 'uuid', ref: 'account', required: true }]));
    await user.click(screen.getByRole('combobox', { name: /Account/ }));
    expect(await screen.findByRole('option', { name: /Salary/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /HDFC Regalia Gold/ })).toBeInTheDocument();
    expect(accountForm().valid).toBe(false);
  });

  it('a loan param picks from the active loans', async () => {
    const form = show(def([{ name: 'loanId', type: 'uuid', ref: 'loan', required: true }]));
    await user.click(screen.getByRole('combobox', { name: /Loan/ }));
    await user.click(await screen.findByRole('option', { name: 'Home loan' }));
    await waitFor(() => expect(form().params()).toEqual({ loanId: 'l1' }));
  });

  it('a stored card that is no longer offered blocks a required param, and an optional one can go back to All', async () => {
    const required = show(def([{ name: 'accountId', type: 'uuid', ref: 'credit_card', required: true }]), { accountId: 'gone' });
    expect(await screen.findByText(/This card is no longer available\. Choose another to save\./)).toBeInTheDocument();
    await waitFor(() => expect(required().valid).toBe(false));
  });

  it('an optional stored card that is gone offers Use All cards', async () => {
    const form = show(def([{ name: 'accountId', type: 'uuid', ref: 'credit_card', required: false }]), { accountId: 'gone' });
    await user.click(await screen.findByRole('button', { name: 'Use All cards' }));
    await waitFor(() => expect(form().params()).toEqual({}));
    expect(screen.queryByRole('button', { name: 'Use All cards' })).toBeNull();
  });

  it('says there is nothing to choose from when the user has no open cards', async () => {
    api.GET.mockImplementation(async () => ({ data: [] }));
    show(def([{ name: 'accountId', type: 'uuid', ref: 'credit_card', required: true }]));
    expect(await screen.findByText('No open credit cards to choose from.')).toBeInTheDocument();
  });
});
