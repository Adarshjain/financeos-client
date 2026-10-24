import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Dialog, DialogBody, DialogContent, DialogSection } from './Dialog';

function setup(section: React.ReactNode) {
  render(
    <Dialog open>
      <DialogContent title="Rule">
        <DialogBody>{section}</DialogBody>
      </DialogContent>
    </Dialog>,
  );
}

describe('Dialog.Section', () => {
  it('is exposed as Dialog.Section', () => {
    expect(Dialog.Section).toBe(DialogSection);
  });

  it('spans the dialog edge to edge and aligns band and content with the body text', () => {
    setup(<Dialog.Section title="Conditions"><p>Body line</p></Dialog.Section>);
    const band = screen.getByText('Conditions').parentElement as HTMLElement;
    const section = band.parentElement as HTMLElement;
    expect(section).toHaveClass('-mx-space-16', 'desk:-mx-space-20');
    expect(band).toHaveClass('px-space-16', 'desk:px-space-20');
    expect(screen.getByText('Body line').parentElement).toHaveClass('px-space-16', 'desk:px-space-20');
  });

  it('a plain section is not a toggle and has no chevron', () => {
    setup(<Dialog.Section title="Conditions"><p>Body line</p></Dialog.Section>);
    expect(screen.queryByRole('button', { name: /Conditions/ })).not.toBeInTheDocument();
    expect(screen.getByText('Body line')).toBeVisible();
  });

  it('collapsible: the whole band toggles, the chevron flips and content folds', () => {
    const onOpenChange = vi.fn();
    setup(
      <Dialog.Section title="Actions" collapsible onOpenChange={onOpenChange}>
        <p>Folded line</p>
      </Dialog.Section>,
    );
    const toggle = screen.getByRole('button', { name: /Actions/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle.querySelector('svg')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Folded line').closest('[aria-hidden="true"]')).not.toBeNull();
    fireEvent.keyDown(toggle, { key: 'Enter' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('collapsible starts closed with defaultOpen={false}', () => {
    setup(<Dialog.Section title="More" collapsible defaultOpen={false}><p>Hidden line</p></Dialog.Section>);
    expect(screen.getByRole('button', { name: /More/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('is controllable with open', () => {
    const onOpenChange = vi.fn();
    setup(<Dialog.Section title="More" collapsible open={false} onOpenChange={onOpenChange}><p>x</p></Dialog.Section>);
    const toggle = screen.getByRole('button', { name: /More/ });
    fireEvent.click(toggle);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});
