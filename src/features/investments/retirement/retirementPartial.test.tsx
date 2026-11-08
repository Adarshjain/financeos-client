import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { employer, summary as epfSummary } from '../epf/epf.fixtures';
import { npsAccount, npsSummary } from './retirement.fixtures';
import { RetirementCard } from './RetirementCard';
import { retirementExcludesNote, retirementModel } from './retirementModel';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));

const fetchEpfSummary = vi.fn();
const fetchEpfEmployers = vi.fn();
const fetchNpsSummary = vi.fn();
vi.mock('../epf/epfServerApi', () => ({ fetchEpfSummary: () => fetchEpfSummary(), fetchEpfEmployers: () => fetchEpfEmployers() }));
vi.mock('../nps/npsServerApi', () => ({ fetchNpsSummary: () => fetchNpsSummary() }));
vi.mock('@/lib/auth', () => ({ redirectToSignIn: vi.fn() }));

import { loadRetirementScreen } from './retirementScreenData';

beforeEach(() => {
  refresh.mockClear();
  fetchEpfSummary.mockResolvedValue(epfSummary());
  fetchEpfEmployers.mockResolvedValue([employer()]);
  fetchNpsSummary.mockResolvedValue(npsSummary([npsAccount()]));
});

describe('loadRetirementScreen', () => {
  it('all ok: both parts, nothing failed', async () => {
    const r = await loadRetirementScreen();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.rows.map((x) => x.kind)).toEqual(['epf', 'nps']);
      expect(r.data.failed).toBeUndefined();
    }
  });

  it('NPS fails, EPF ok: EPF row, NPS marked failed, total is the EPF sum', async () => {
    fetchNpsSummary.mockRejectedValue(new Error('boom'));
    const r = await loadRetirementScreen();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.rows.map((x) => x.kind)).toEqual(['epf']);
      expect(r.data.failed?.nps).toBeDefined();
      expect(r.data.failed?.epf).toBeUndefined();
      expect(r.data.total).toBe(epfSummary().balance);
      expect(retirementExcludesNote(r.data.failed)).toBe("Excludes NPS — couldn't load");
    }
  });

  it('EPF employers fail, NPS ok: NPS rows, EPF marked failed', async () => {
    fetchEpfEmployers.mockRejectedValue(new Error('boom'));
    const r = await loadRetirementScreen();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.rows.every((x) => x.kind === 'nps')).toBe(true);
      expect(r.data.failed?.epf).toBeDefined();
      expect(retirementExcludesNote(r.data.failed)).toBe("Excludes EPF — couldn't load");
    }
  });

  it('both fail: a failure, so the whole card shows the load error', async () => {
    fetchEpfSummary.mockRejectedValue(new Error('boom'));
    fetchNpsSummary.mockRejectedValue(new Error('boom'));
    expect((await loadRetirementScreen()).ok).toBe(false);
  });
});

describe('retirementModel with a failed part', () => {
  it('has no upload line for the failed part', () => {
    const model = retirementModel(epfSummary(), [employer()], null, { nps: { reference: 'r-1' } });
    expect(model.npsMissing).toBe(true);
    expect(model.failed?.nps?.reference).toBe('r-1');
    expect(retirementExcludesNote({ epf: {}, nps: {} })).toBe("Excludes EPF and NPS — couldn't load");
    expect(retirementExcludesNote(undefined)).toBeNull();
  });
});

describe('RetirementCard partial failure', () => {
  it('NPS failed: EPF row shows, NPS line with Retry and reference', () => {
    render(<RetirementCard model={retirementModel(epfSummary(), [employer()], null, { nps: { reference: 'req-9' } })} />);
    expect(screen.getByText('EPF')).toBeTruthy();
    expect(screen.getByText(/Couldn.t load NPS\./)).toBeTruthy();
    expect(screen.getByText('Reference req-9')).toBeTruthy();
    expect(screen.queryByText("Excludes NPS — couldn't load")).toBeNull();
    expect(screen.queryByText('Upload statement')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('EPF failed: NPS rows show, EPF line with Retry', () => {
    render(<RetirementCard model={retirementModel(null, null, npsSummary([npsAccount()]), { epf: {} })} />);
    expect(screen.getByText(/Couldn.t load EPF\./)).toBeTruthy();
    expect(screen.queryByText(/^Reference/)).toBeNull();
    expect(screen.queryByText('Upload passbook')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('all ok: no failure line', () => {
    render(<RetirementCard model={retirementModel(epfSummary(), [employer()], npsSummary([npsAccount()]))} />);
    expect(screen.queryByText(/Couldn.t load/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });
});
