import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DropZone } from './DropZone';

const props = { title: 'Add statements', hint: 'PDF or XLSX', buttonLabel: 'Choose files' };
const file = (name: string, type = '') => new File(['x'], name, { type });

function drop(root: HTMLElement, files: File[]) {
  const event = createEvent.drop(root);
  Object.defineProperty(event, 'dataTransfer', { value: { files } });
  fireEvent(root, event);
}

describe('DropZone: accepted files', () => {
  it('keeps only dropped files the accept list allows, like the picker', () => {
    const onFilesSelected = vi.fn();
    const { container } = render(<DropZone {...props} accept=".pdf,.xlsx" onFilesSelected={onFilesSelected} />);
    drop(container.firstElementChild as HTMLElement, [file('a.pdf'), file('b.docx'), file('C.XLSX')]);
    expect(onFilesSelected).toHaveBeenCalledWith([expect.objectContaining({ name: 'a.pdf' }), expect.objectContaining({ name: 'C.XLSX' })]);
  });

  it('does nothing when no dropped file is allowed', () => {
    const onFilesSelected = vi.fn();
    const { container } = render(<DropZone {...props} accept=".pdf" onFilesSelected={onFilesSelected} />);
    drop(container.firstElementChild as HTMLElement, [file('b.docx')]);
    expect(onFilesSelected).not.toHaveBeenCalled();
  });

  it('matches mime types and wildcards, and takes everything without a list', () => {
    const onFilesSelected = vi.fn();
    const { container, rerender } = render(<DropZone {...props} accept="image/*,application/pdf" onFilesSelected={onFilesSelected} />);
    const root = container.firstElementChild as HTMLElement;
    drop(root, [file('p.png', 'image/png'), file('d.pdf', 'application/pdf'), file('t.txt', 'text/plain')]);
    expect(onFilesSelected.mock.calls[0][0]).toHaveLength(2);
    rerender(<DropZone {...props} onFilesSelected={onFilesSelected} />);
    drop(root, [file('t.txt', 'text/plain')]);
    expect(onFilesSelected).toHaveBeenLastCalledWith([expect.objectContaining({ name: 't.txt' })]);
  });

  it('clears the input after each change, so the same file can be chosen again', () => {
    const onFilesSelected = vi.fn();
    const { container } = render(<DropZone {...props} onFilesSelected={onFilesSelected} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const setValue = vi.fn();
    Object.defineProperty(input, 'value', { configurable: true, get: () => 'C:\\fakepath\\a.pdf', set: setValue });
    fireEvent.change(input, { target: { files: [file('a.pdf')] } });
    expect(onFilesSelected).toHaveBeenCalledTimes(1);
    expect(setValue).toHaveBeenCalledWith('');
    expect(screen.getByText('Add statements')).toBeInTheDocument();
  });
});
