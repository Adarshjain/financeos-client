import { screen } from '@testing-library/react';
import { expect } from 'vitest';

/**
 * Asserts a paged page shows its pager both above and below the list (around
 * `listItem`, any rendered row), and that neither copy lives in a filter area:
 * for each `filterControls` element (e.g. the search box, desktop and mobile
 * copies), the largest container holding it but not the list holds no pager.
 */
export function expectPagersAroundList(
  listItem: HTMLElement,
  filterControls: HTMLElement[] = []
) {
  const navs = screen.getAllByRole('navigation', { name: 'Pagination' });
  expect(navs).toHaveLength(2);
  expect(
    navs[0].compareDocumentPosition(listItem) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
  expect(
    navs[1].compareDocumentPosition(listItem) & Node.DOCUMENT_POSITION_PRECEDING
  ).toBeTruthy();

  for (const control of filterControls) {
    let area: HTMLElement = control;
    while (area.parentElement && !area.parentElement.contains(listItem))
      area = area.parentElement;
    for (const nav of navs) expect(area.contains(nav)).toBe(false);
  }
}
