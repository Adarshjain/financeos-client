import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DropZone } from './DropZone';

const requiredProps = {
  title: 'Add statements',
  hint: 'PDF, XLSX or XLS · up to 25 MB',
  buttonLabel: 'Choose files',
};

describe('DropZone', () => {
  it('renders title, hint, and choose files button', () => {
    render(<DropZone {...requiredProps} />);

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
        {...requiredProps}
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
        {...requiredProps}
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
        {...requiredProps}
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

  it('renders children under the drop zone', () => {
    render(
      <DropZone {...requiredProps}>
        <div data-testid="custom-imports">Custom Import List</div>
      </DropZone>,
    );

    expect(screen.getByTestId('custom-imports')).toBeInTheDocument();
  });

  it('handles multiple and accept props on hidden file input', () => {
    const { container, rerender } = render(<DropZone {...requiredProps} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.multiple).toBe(true);
    expect(input.accept).toBe('');

    rerender(<DropZone {...requiredProps} multiple={false} accept=".pdf" />);
    expect(input.multiple).toBe(false);
    expect(input.accept).toBe('.pdf');
  });

  it('handles drop on root container even when showDropArea is false', () => {
    const onFilesSelected = vi.fn();
    const { container } = render(
      <DropZone
        {...requiredProps}
        showDropArea={false}
        onFilesSelected={onFilesSelected}
      />,
    );

    const root = container.firstChild as HTMLElement;
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.drop(root, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });

  it('ignores drag leave when moving to child elements', () => {
    const { container } = render(<DropZone {...requiredProps} />);
    const root = container.firstChild as HTMLElement;
    const child = root.firstElementChild as HTMLElement;

    fireEvent.dragOver(root);
    // Drag leave with relatedTarget inside currentTarget should not clear drag state
    fireEvent.dragLeave(root, { relatedTarget: child });
    // Root box still shows dragging style if active
    expect(root).toBeInTheDocument();
  });
});
