import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } }));
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: vi.fn(),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('./npsImportRefetch', () => ({ scheduleNpsImportRefetch: vi.fn() }));

import { showToast } from '@/components/ds/Toast/Toast';
import { serverApi as api } from '@/lib/api/server';
import { renderWithQuery } from '@/test/renderWithQuery';

import { NpsGmailBanners } from './NpsGmailBanners';

describe('NpsGmailBanners', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: {} } as never);
    vi.mocked(api.POST).mockResolvedValue({ data: { accountId: 'a1', importing: 3 } } as never);
    vi.mocked(api.DELETE).mockResolvedValue({ data: undefined } as never);
  });

  it('renders nothing with no detections and nothing locked', () => {
    const { container } = renderWithQuery(<NpsGmailBanners locked={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the locked banner when statements are locked', () => {
    renderWithQuery(<NpsGmailBanners locked={2} />);
    expect(screen.getByText('2 NPS statements need a password')).toBeInTheDocument();
  });

  it('shows the failed banner with the count and nothing else', () => {
    renderWithQuery(<NpsGmailBanners locked={0} failed={2} />);
    expect(screen.getByText("2 NPS statements from Gmail couldn't be imported")).toBeInTheDocument();
  });

  it('Retry posts the retry call and toasts how many are importing', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { importing: 2 } } as never);
    renderWithQuery(<NpsGmailBanners locked={0} failed={2} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith('/api/v1/nps/gmail-detections/retry'));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Importing 2 statements…'));
  });

  it('Retry failure shows a danger toast', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('boom'));
    renderWithQuery(<NpsGmailBanners locked={0} failed={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.any(String), { tone: 'danger' }));
  });

  it('Unlock toasts how many opened and how many are still locked', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { opened: 1, stillLocked: 2 } } as never);
    renderWithQuery(<NpsGmailBanners locked={3} />);
    await userEvent.type(screen.getByLabelText('Statement password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Opened 1, 2 still locked', { tone: undefined }));
  });
});
