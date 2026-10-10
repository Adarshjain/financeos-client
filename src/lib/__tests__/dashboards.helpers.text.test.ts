import { describe, expect, it } from 'vitest';

import {
  isTextWidget,
  isWidgetAvailable,
  newTextWidget,
  TEXT_DESCRIPTION_MAX,
  TEXT_TITLE_MAX,
  textDescription,
  textWidgetHeight,
  toDashboardWidget,
  validateWidgets,
  widgetMinW,
  widgetTitle,
} from '@/lib/dashboards.helpers';
import type { DashboardWidget, WidgetResponse } from '@/lib/dashboards.types';

const header = (over: Partial<WidgetResponse> = {}): WidgetResponse => ({
  id: 'h', kind: 'text', reportId: null, builtinKey: null, title: 'Spending', params: null,
  layout: { x: 0, y: 0, w: 100, h: 5 }, ...over,
});
const asRequest = (w: WidgetResponse): DashboardWidget => toDashboardWidget(w);

describe('section header helpers', () => {
  it('newTextWidget is full width at x=0 whatever the layout asks, height by description', () => {
    const w = newTextWidget('Spending', '', { x: 40, y: 12, w: 30, h: 99 });
    expect(w).toMatchObject({ kind: 'text', title: 'Spending', params: null, layout: { x: 0, y: 12, w: 100, h: 5 } });
    expect(newTextWidget('A', ' Cards ').params).toEqual({ description: 'Cards' });
    expect(newTextWidget('A', 'Cards').layout.h).toBe(6);
  });

  it('textWidgetHeight is 5 rows without a description and 6 with one', () => {
    expect(textWidgetHeight('')).toBe(5);
    expect(textWidgetHeight('  ')).toBe(5);
    expect(textWidgetHeight('x')).toBe(6);
  });

  it('isTextWidget only for kind text', () => {
    expect(isTextWidget(header())).toBe(true);
    expect(isTextWidget({ kind: 'report' })).toBe(false);
    expect(isTextWidget({ kind: 'builtin' })).toBe(false);
  });

  it('textDescription reads params.description, else empty', () => {
    expect(textDescription(header({ params: { description: 'Cards' } }))).toBe('Cards');
    expect(textDescription(header({ params: null }))).toBe('');
    expect(textDescription(header({ params: { description: 5 } }))).toBe('');
  });

  it('a header is always available, takes the whole grid, and its title is its text', () => {
    expect(isWidgetAvailable(header())).toBe(true);
    expect(widgetMinW(header())).toBe(100);
    expect(widgetTitle(header({ title: '  Spending ' }))).toBe('Spending');
    expect(widgetTitle(header({ title: '' }))).toBe('Untitled section');
  });

  it('toDashboardWidget sends kind text, trimmed title and description, no report or built-in', () => {
    expect(toDashboardWidget(header({ title: ' A ', params: { description: ' B ' }, reportId: 'stray', builtinKey: 'stray' }))).toEqual({
      id: 'h', kind: 'text', reportId: null, builtinKey: null, params: { description: 'B' }, title: 'A',
      layout: { x: 0, y: 0, w: 100, h: 5 },
    });
    expect(toDashboardWidget(header({ params: { description: '   ' } })).params).toBeNull();
    expect(toDashboardWidget(header({ title: '  ' })).title).toBeNull();
  });
});

describe('validateWidgets for headers', () => {
  it('a titled full-width header is valid', () => {
    expect(validateWidgets([asRequest(header({ params: { description: 'x' } }))])).toEqual([]);
  });

  it('a header needs a title', () => {
    expect(validateWidgets([asRequest(header({ title: '' }))])).toEqual(['Give every header a title.']);
  });

  it('title and description length limits match the server', () => {
    expect(validateWidgets([asRequest(header({ title: 'a'.repeat(TEXT_TITLE_MAX) }))])).toEqual([]);
    expect(validateWidgets([asRequest(header({ title: 'a'.repeat(TEXT_TITLE_MAX + 1) }))]))
      .toEqual([`Header titles can be at most ${TEXT_TITLE_MAX} characters.`]);
    expect(validateWidgets([asRequest(header({ params: { description: 'd'.repeat(TEXT_DESCRIPTION_MAX) } }))])).toEqual([]);
    expect(validateWidgets([asRequest(header({ params: { description: 'd'.repeat(TEXT_DESCRIPTION_MAX + 1) } }))]))
      .toEqual([`Header descriptions can be at most ${TEXT_DESCRIPTION_MAX} characters.`]);
  });

  it('a header must span the full width from column 0', () => {
    expect(validateWidgets([asRequest(header({ layout: { x: 0, y: 0, w: 50, h: 5 } }))])).toEqual(['Headers must span the full width.']);
    expect(validateWidgets([asRequest(header({ layout: { x: 1, y: 0, w: 99, h: 5 } }))])).toEqual(['Headers must span the full width.']);
  });

  it('duplicate ids are still caught for headers', () => {
    expect(validateWidgets([asRequest(header()), asRequest(header())])).toContain('Duplicate widget id: h');
  });
});
