import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DropZone } from './DropZone';

describe('DropZone', () => {
  it('renders title, hint, and choose files button', () => {
    render(
      <DropZone
        title="Add statements"
        hint="PDF, XLSX or XLS · up to 25 MB"
        buttonLabel="Choose files"
      />,
    );

    expect(screen.getByText('Add statements')).toBeInTheDocument();
    expect(
      screen.getByText('PDF, XLSX or XLS · up to 25 MB'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /choose files/i }),
    ).toBeInTheDocument();
  });

  it('renders dragging over state and hides choose files button', () => {
    render(
      <DropZone
        isDragging={true}
        dragTitle="Drop to add"
        dragHint="3 files"
      />,
    );

    expect(screen.getByText('Drop to add')).toBeInTheDocument();
    expect(screen.getByText('3 files')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /choose files/i }),
    ).not.toBeInTheDocument();
  });

  it('renders queued files and handles remove callback', () => {
    const handleRemove = vi.fn();
    render(
      <DropZone
        queuedFiles={[
          { id: '1', name: 'Regalia-Gold-Oct.pdf', size: '412 KB' },
        ]}
        onRemoveFile={handleRemove}
      />,
    );

    expect(screen.getByText('Regalia-Gold-Oct.pdf')).toBeInTheDocument();
    expect(screen.getByText('412 KB')).toBeInTheDocument();
    const removeBtn = screen.getByRole('button', {
      name: /remove regalia-gold-oct\.pdf/i,
    });
    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Regalia-Gold-Oct.pdf' }),
    );
  });

  it('renders file with error styling', () => {
    render(
      <DropZone
        queuedFiles={[
          {
            id: '1',
            name: 'Huge-Statement.pdf',
            size: '31 MB',
            error: 'over 25 MB',
          },
        ]}
      />,
    );

    const errorEl = screen.getByText('31 MB · over 25 MB');
    expect(errorEl).toHaveClass('text-danger');
  });

  it('renders recent imports list', () => {
    render(
      <DropZone
        recentImports={[
          {
            id: '1',
            name: 'HDFC-Savings.pdf',
            status: 'Done',
            statusTone: 'positive',
          },
          {
            id: '2',
            name: 'ICICI-Card.pdf',
            status: '1 warning',
            statusTone: 'warning',
          },
        ]}
      />,
    );

    expect(screen.getByText('Recent imports')).toBeInTheDocument();
    expect(screen.getByText('HDFC-Savings.pdf')).toBeInTheDocument();
    expect(screen.getByText('Done')).toHaveClass('text-positive');
    expect(screen.getByText('1 warning')).toHaveClass('text-warning');
  });
});
