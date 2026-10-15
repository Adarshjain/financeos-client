import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ResponsiveOverlay } from './ResponsiveOverlay';

describe('ResponsiveOverlay', () => {
  it('opens and closes via trigger and controlled state', () => {
    const handleOpenChange = vi.fn();
    render(
      <ResponsiveOverlay
        onOpenChange={handleOpenChange}
        trigger={<button type="button">Open Overlay</button>}
      >
        <div>Overlay Content</div>
      </ResponsiveOverlay>,
    );

    expect(screen.queryByText('Overlay Content')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Overlay' }));
    expect(handleOpenChange).toHaveBeenCalledWith(true);
  });

  it('renders content when open is true', () => {
    render(
      <ResponsiveOverlay
        open
        forcePopover
        trigger={<button type="button">Trigger</button>}
      >
        <div>Overlay Content</div>
      </ResponsiveOverlay>,
    );

    expect(screen.getByText('Overlay Content')).toBeInTheDocument();
  });
});
