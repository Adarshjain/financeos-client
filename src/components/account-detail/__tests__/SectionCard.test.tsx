import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SectionCard } from '../SectionCard';

describe('SectionCard', () => {
  it('renders the title as a heading with the subtitle, icon chip and body', () => {
    render(
      <SectionCard icon={<svg data-testid="icon" />} title="Overview" subtitle="All details">
        <p>Body</p>
      </SectionCard>
    );
    expect(screen.getByRole('heading', { name: 'Overview', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('All details')).toBeInTheDocument();
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('pads the body on every side by default', () => {
    render(
      <SectionCard icon={<svg />} title="T">
        <p>Body</p>
      </SectionCard>
    );
    const body = screen.getByText('Body').parentElement!;
    expect(body.className).toContain('px-4');
    expect(body.className).toContain('pb-4');
  });

  it('lets a section override the body padding for full-bleed rows', () => {
    render(
      <SectionCard icon={<svg />} title="T" bodyClassName="px-0 sm:px-0">
        <p>Rows</p>
      </SectionCard>
    );
    const body = screen.getByText('Rows').parentElement!;
    expect(body.className).toContain('px-0');
    expect(body.className).not.toMatch(/(^| )px-4( |$)/);
  });

  it('renders a header-only card with even padding and no body when there are no children', () => {
    const { container } = render(<SectionCard icon={<svg />} title="Earning rules" action={<a href="/x">Manage</a>} />);
    const section = container.querySelector('section')!;
    expect(section.children).toHaveLength(1);
    const header = section.querySelector('header')!;
    expect(header.className).toContain('pb-4');
    expect(header.className).not.toContain('pb-3');
    expect(screen.getByRole('link', { name: 'Manage' })).toHaveAttribute('href', '/x');
  });

  it('omits the subtitle line when none is given', () => {
    const { container } = render(
      <SectionCard icon={<svg />} title="T">
        <span>b</span>
      </SectionCard>
    );
    expect(container.querySelector('header p')).toBeNull();
  });

  it('passes a test id through to the section', () => {
    render(
      <SectionCard icon={<svg />} title="T" data-testid="sec">
        <span>b</span>
      </SectionCard>
    );
    expect(screen.getByTestId('sec').tagName).toBe('SECTION');
  });
});
