import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { MappingCell, type MappingCellProps } from './MappingCell';

vi.mock('../InstrumentSelect', () => ({
  InstrumentSelect: ({ trigger, onValueChange }: { trigger: React.ReactNode; onValueChange: (i: { id: string; name: string }) => void }) => (
    <div onClick={() => onValueChange({ id: 'i2', name: 'Right Ltd' })}>{trigger}</div>
  ),
}));

const base: MappingCellProps = {
  label: 'ZOMATO',
  duplicate: false,
  state: undefined,
  type: 'stock',
  onMap: vi.fn(),
  onCreateNew: vi.fn(),
};

describe('MappingCell', () => {
  it('lets a server-matched row be remapped with "change", with no Mapped word until it is', () => {
    const onMap = vi.fn();
    render(<MappingCell {...base} matchedName="Zomato Ltd" state={{ skip: false, selectedInstrumentId: 'i1' }} onMap={onMap} />);
    expect(screen.getByText('Zomato Ltd')).toBeInTheDocument();
    expect(screen.queryByText('Mapped')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'change' }));
    expect(onMap).toHaveBeenCalledWith({ id: 'i2', name: 'Right Ltd' });
  });

  it('shows Mapped with the picked name and "change" after a manual map', () => {
    render(<MappingCell {...base} matchedName="Zomato Ltd" state={{ skip: false, selectedInstrumentId: 'i2', selectedInstrumentName: 'Right Ltd' }} />);
    expect(screen.getByText('Mapped')).toBeInTheDocument();
    expect(screen.getByText('Right Ltd')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'change' })).toBeInTheDocument();
  });

  it('offers Map instrument and Create new on an unmatched row, and Duplicate after any state', () => {
    render(<MappingCell {...base} duplicate state={{ skip: true }} />);
    expect(screen.getByText('Unmatched')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Map instrument' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create new' })).toBeInTheDocument();
    expect(screen.getByText(/Duplicate/)).toBeInTheDocument();
  });
});
