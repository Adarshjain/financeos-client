import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OfflineContent } from './OfflineContent';
import DsOfflinePage from './page';

describe('/offline page and OfflineContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders offline title, copy, and try again button', () => {
    render(<OfflineContent />);

    expect(screen.getByText("You're offline")).toBeDefined();
    expect(
      screen.getByText(
        "Check your connection.",
      ),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeDefined();
  });

  it('clicking Retry triggers page reload', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: reloadMock },
    });

    render(<OfflineContent />);

    const button = screen.getByRole('button', { name: 'Retry' });
    fireEvent.click(button);

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('DsOfflinePage server component renders without crashing', () => {
    const element = DsOfflinePage();
    expect(element).toBeDefined();
  });
});
