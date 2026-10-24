import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RewardCardRecommendation, RewardRecommendationResponse } from '@/lib/rewards.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { WhichCard } from './WhichCard';

const POST = vi.fn();
vi.mock('@/lib/api/client', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/client')>()),
  api: { POST: (...a: unknown[]) => POST(...a) },
}));
const showToast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...a: unknown[]) => showToast(...a),
}));

const data = {
  cards: [{ id: 'a', name: 'HDFC Regalia' }, { id: 'b', name: 'SBI Cashback' }],
  categories: [{ id: 'c1', name: 'Dining' }, { id: 'c2', name: 'Fuel' }],
};

const rec = (over: Partial<RewardCardRecommendation>): RewardCardRecommendation => ({
  accountId: 'a',
  accountName: 'HDFC Regalia',
  rank: 1,
  totalValueInr: 300,
  guaranteedValueInr: 300,
  milestoneValueInr: 0,
  effectiveRatePct: 6.7,
  pointValueSource: 'CONFIG',
  pointValueInr: 0.5,
  pointsValued: true,
  ruleLines: [
    { ruleId: 'r1', ruleName: '5X dining', stacking: null, earned: 600, earnedUnit: 'POINTS', earnedValueInr: 300, reason: 'MATCHED', capStatus: null },
  ],
  milestones: [
    { milestoneId: 'm1', name: 'Annual 4L', windowEnd: '2027-03-31', progress: 100000, threshold: 400000, remainingToThreshold: 300000, crosses: true, scoredValueInr: 250, payoutType: 'CASH_VALUE' },
  ],
  noRulesConfigured: false,
  cycleFallback: false,
  anniversaryFallback: false,
  ...over,
});

const response = (recommendations: RewardCardRecommendation[]): RewardRecommendationResponse => ({
  input: { amount: 4500, date: '2026-10-13', categoryIds: ['c1'] },
  recommendations,
});

const renderPage = () => renderWithQuery(<WhichCard data={data} today="2026-10-13" />);
const rank = () => fireEvent.click(screen.getByRole('button', { name: 'Rank cards' }));

describe('WhichCard', () => {
  beforeEach(() => {
    POST.mockReset();
    showToast.mockReset();
  });

  it('asks for a valid amount with the Legacy message and sends nothing', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: '' } });
    rank();
    expect(screen.getByText('Please enter a valid spend amount greater than ₹0')).toBeInTheDocument();
    expect(POST).not.toHaveBeenCalled();
  });

  it('sends the form and ranks the cards, the best first and badged', async () => {
    POST.mockResolvedValue({
      data: response([rec({}), rec({ accountId: 'b', accountName: 'SBI Cashback', rank: 2, totalValueInr: 45, effectiveRatePct: 1, ruleLines: [], milestones: [] })]),
    });
    renderPage();
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: '4500' } });
    rank();
    expect(await screen.findByText('Ranked for ₹4,500 dining today')).toBeInTheDocument();
    expect(POST).toHaveBeenCalledWith('/api/v1/reward-recommendations', {
      body: expect.objectContaining({ amount: 4500, date: '2026-10-13', isEmi: false, isIntl: false }),
    });
    expect(screen.getByText('2 cards evaluated')).toBeInTheDocument();
    expect(screen.getByText('Best')).toBeInTheDocument();
    expect(screen.getByText('₹300')).toBeInTheDocument();
    expect(screen.getByText('₹45')).toBeInTheDocument();
    expect(screen.getByText('6.7% effective return')).toBeInTheDocument();
  });

  it('opens the breakdown of the tapped card in a dialog and closes it', async () => {
    POST.mockResolvedValue({ data: response([rec({})]) });
    renderPage();
    rank();
    fireEvent.click(await screen.findByText('HDFC Regalia'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Rule breakdown')).toBeInTheDocument();
    expect(within(dialog).getByText('5X dining')).toBeInTheDocument();
    expect(within(dialog).getByText('600 pts')).toBeInTheDocument();
    expect(within(dialog).getByText('Crosses the threshold on this spend')).toBeInTheDocument();
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Close' }).at(-1)!);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('notes a card with no reward rules', async () => {
    POST.mockResolvedValue({
      data: response([rec({ noRulesConfigured: true, totalValueInr: 0, effectiveRatePct: 0, ruleLines: [], milestones: [] })]),
    });
    renderPage();
    rank();
    expect(await screen.findByText('No reward rules configured')).toBeInTheDocument();
  });

  it('notes an assumed point value, and lists point values and the MCC under Assumptions', async () => {
    POST.mockResolvedValue({
      data: {
        ...response([rec({ pointValueSource: 'DEFAULT', pointValueInr: 0.25 })]),
        input: { amount: 4500, mcc: '5812' },
      },
    });
    renderPage();
    rank();
    expect(await screen.findByText('Assumed ₹0.25/pt')).toBeInTheDocument();
    expect(screen.getByText('Assumptions')).toBeInTheDocument();
    expect(screen.getByText('HDFC Regalia ₹0.25')).toBeInTheDocument();
    expect(screen.getByText('5812')).toBeInTheDocument();
  });

  it('keeps every Legacy input under More options', () => {
    renderPage();
    for (const label of ['Merchant', 'MCC', 'More categories', 'Cards to compare']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('EMI transaction')).toBeInTheDocument();
    expect(screen.getByText('International')).toBeInTheDocument();
  });

  it('shows the Legacy error toast when the simulation fails', async () => {
    POST.mockRejectedValue(new Error('boom'));
    renderPage();
    rank();
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Failed to simulate card rewards', { tone: 'danger' }));
  });
});
