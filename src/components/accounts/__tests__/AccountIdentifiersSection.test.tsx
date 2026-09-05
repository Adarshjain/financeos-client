import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountIdentifiersSection } from '@/components/accounts/account-form/AccountIdentifiersSection';
import { api } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() } };
});

const mockIdentifiers = [
  {
    id: 'ident-1',
    value: '987654',
    kind: 'CUSTOMER_ID' as const,
    createdAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'ident-2',
    value: 'CRN123',
    kind: 'CRN' as const,
    createdAt: '2026-09-02T00:00:00Z',
  },
];

describe('AccountIdentifiersSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders existing identifiers and allows adding a new one (no kind field)', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: mockIdentifiers } as never);
    vi.mocked(api.POST).mockResolvedValue({
      data: { id: 'ident-3', value: '4321', kind: 'OTHER', createdAt: '2026-09-03T00:00:00Z' },
    } as never);

    renderWithQuery(<AccountIdentifiersSection accountId="acc-1" />);

    await waitFor(() => {
      expect(screen.getByText('987654')).toBeInTheDocument();
      expect(screen.getByText('CRN123')).toBeInTheDocument();
    });
    expect(screen.queryByText('Customer ID')).not.toBeInTheDocument();

    const input = screen.getByPlaceholderText(/e\.g\. 1234 or CRN/i);
    fireEvent.change(input, { target: { value: '4321' } });

    const addBtn = screen.getByRole('button', { name: /Add/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith(
        '/api/v1/accounts/{id}/identifiers',
        expect.objectContaining({
          params: { path: { id: 'acc-1' } },
          body: { value: '4321' },
        })
      );
    });
  });

  it('allows deleting an identifier', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: mockIdentifiers } as never);
    vi.mocked(api.DELETE).mockResolvedValue({ data: null } as never);

    renderWithQuery(<AccountIdentifiersSection accountId="acc-1" />);

    await waitFor(() => {
      expect(screen.getByText('987654')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole('button', { name: /Remove identifier 987654/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(api.DELETE).toHaveBeenCalledWith(
        '/api/v1/accounts/{id}/identifiers/{identifierId}',
        expect.objectContaining({
          params: { path: { id: 'acc-1', identifierId: 'ident-1' } },
        })
      );
    });
  });

  it('create mode: collects values locally via Enter without calling the API', async () => {
    const onPendingChange = vi.fn();
    renderWithQuery(<AccountIdentifiersSection pending={['9999']} onPendingChange={onPendingChange} />);

    expect(screen.getByText('9999')).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/e\.g\. 1234 or CRN/i);
    fireEvent.change(input, { target: { value: ' 43 21 ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onPendingChange).toHaveBeenCalledWith(['9999', '4321']);
    });
    expect(api.GET).not.toHaveBeenCalled();
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('create mode: remove drops the value from the pending list', () => {
    const onPendingChange = vi.fn();
    renderWithQuery(<AccountIdentifiersSection pending={['9999', '4321']} onPendingChange={onPendingChange} />);

    fireEvent.click(screen.getByRole('button', { name: /Remove identifier 9999/i }));
    expect(onPendingChange).toHaveBeenCalledWith(['4321']);
    expect(api.DELETE).not.toHaveBeenCalled();
  });
});
