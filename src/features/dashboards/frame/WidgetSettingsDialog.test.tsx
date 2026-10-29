import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { WidgetResponse } from '@/lib/dashboards.types';
import { renderWithQuery as render } from '@/test/renderWithQuery';

import { WidgetSettingsDialog } from './WidgetSettingsDialog';

const widget = { id: 'w1', title: 'Mine', report: { name: 'Spend' } } as unknown as WidgetResponse;

describe('WidgetSettingsDialog', () => {
  it('submitting the form from the Title field (Enter) saves and closes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<WidgetSettingsDialog widget={widget} onSave={onSave} onClose={onClose} />);
    const title = screen.getByLabelText(/Title/);
    fireEvent.change(title, { target: { value: ' New ' } });
    fireEvent.submit(title.closest('form') as HTMLFormElement);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ title: 'New' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
