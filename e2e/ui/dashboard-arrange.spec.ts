import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createDashboard, createReport, widget } from '../fixtures/seed/reports';
import { expect, test } from '../fixtures/test';

// Arranging a dashboard in edit mode: cards move only by their grip, the
// content under an edit card ignores taps and clicks, and a drag held near the
// top or bottom of the viewport scrolls the page. Each test runs with a mouse
// on desktop and with a finger on the phone project.

type Point = { x: number; y: number };

/** Drags from `from` to `to` (viewport coordinates), holding at `to` for `holdMs` before releasing. */
async function drag(page: Page, isMobile: boolean, from: Point, to: Point, holdMs = 150) {
  const steps = 15;
  if (!isMobile) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps });
    await page.waitForTimeout(holdMs);
    await page.mouse.up();
    return;
  }
  // Playwright's touchscreen only taps: drive the touch sequence through CDP (Chromium).
  const cdp = await page.context().newCDPSession(page);
  const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd', p?: Point) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y, id: 1 }] : [] });
  await touch('touchStart', from);
  for (let i = 1; i <= steps; i++) {
    await touch('touchMove', { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps });
  }
  await page.waitForTimeout(holdMs);
  await touch('touchEnd');
  await cdp.detach();
}

async function centerOf(page: Page, locator: ReturnType<Page['locator']>): Promise<Point> {
  await locator.scrollIntoViewIfNeeded();
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Each edit card's page-relative top, keyed by its title input. */
async function cardTops(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('[data-testid="dashboard-widget"]')].map((card) => [
        (card.querySelector('input[aria-label="Widget title"]') as HTMLInputElement).value,
        card.getBoundingClientRect().top + window.scrollY,
      ]),
    ),
  );
}

test.describe('Dashboard arranging UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-dash-arrange');
    await loginContext(context, currentUser.cookie);
  });

  /** A full-width stack of `count` tall KPI cards titled W1..Wn, top to bottom. */
  async function seedStack(name: string, count: number) {
    const api = makeApi(currentUser.cookie);
    const report = await createReport(api, {
      name: 'Arrange KPI',
      type: 'KPI',
      datasource: 'transactions',
      definition: { measure: 'amount', aggregation: 'sum', filters: [] },
    });
    const widgets = Array.from({ length: count }, (_, i) =>
      widget(report.id, { x: 0, y: i * 20, w: 100, h: 20 }, `W${i + 1}`, `w${i + 1}`),
    );
    const dashboard = await createDashboard(api, { name, isDefault: false, widgets });
    return dashboard;
  }

  async function openEditor(page: Page, dashboardId: string) {
    await page.goto(`/dashboards/${dashboardId}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(page.getByTestId('dashboard-drag-handle').first()).toBeVisible();
    // The grid first lays out at its default width and animates to the measured one; on a phone
    // the page is wider than the screen until then. Arrange only once it fits.
    const viewportWidth = page.viewportSize()!.width;
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(viewportWidth);
  }

  const card = (page: Page, title: string) =>
    page.getByTestId('dashboard-widget').filter({ has: page.locator(`input[aria-label="Widget title"][value="${title}"]`) });

  test('@mobile a card moves by its grip, never by its title or content', async ({ page, isMobile }) => {
    const dashboard = await seedStack('Arrange grip', 2);
    await openEditor(page, dashboard.id);
    const before = await cardTops(page);
    expect(before.W1).toBeLessThan(before.W2);

    // Dragging W1 by its title input or its content leaves the order alone.
    const titleAt = await centerOf(page, card(page, 'W1').getByLabel('Widget title'));
    await drag(page, isMobile, titleAt, { x: titleAt.x, y: titleAt.y + 400 });
    const contentAt = await centerOf(page, card(page, 'W1').getByTestId('dashboard-widget-shield'));
    await drag(page, isMobile, contentAt, { x: contentAt.x, y: contentAt.y + 400 });
    const unmoved = await cardTops(page);
    expect(unmoved.W1).toBeLessThan(unmoved.W2);

    // Dragging it by the grip past W2 swaps them.
    const gripAt = await centerOf(page, card(page, 'W1').getByTestId('dashboard-drag-handle'));
    const w2Box = (await card(page, 'W2').boundingBox())!;
    await drag(page, isMobile, gripAt, { x: gripAt.x, y: w2Box.y + w2Box.height * 0.75 }, 400);
    await expect.poll(async () => {
      const after = await cardTops(page);
      return after.W1 > after.W2;
    }).toBe(true);
  });

  test('@mobile while editing, a layer covers each card so taps on its content do nothing', async ({ page }) => {
    const dashboard = await seedStack('Arrange shield', 1);
    await openEditor(page, dashboard.id);

    const shield = card(page, 'W1').getByTestId('dashboard-widget-shield');
    const at = await centerOf(page, shield);
    const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.getAttribute('data-testid'), at);
    expect(hit).toBe('dashboard-widget-shield');

    const url = page.url();
    await page.mouse.click(at.x, at.y);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(page.url()).toBe(url);
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  });

  test('@mobile holding a dragged card at the top edge scrolls the page up and carries the card along', async ({ page, isMobile }) => {
    const dashboard = await seedStack('Arrange scroll up', 8);
    await openEditor(page, dashboard.id);

    const gripAt = await centerOf(page, card(page, 'W8').getByTestId('dashboard-drag-handle'));
    const startScroll = await page.evaluate(() => window.scrollY);
    expect(startScroll).toBeGreaterThan(300);

    await drag(page, isMobile, gripAt, { x: gripAt.x, y: 20 }, 1500);

    const endScroll = await page.evaluate(() => window.scrollY);
    expect(endScroll).toBeLessThan(startScroll - 300);
    // The card followed the page up past its neighbour.
    await expect.poll(async () => {
      const tops = await cardTops(page);
      return tops.W8 < tops.W7;
    }).toBe(true);
  });

  test('@mobile holding a dragged card at the bottom edge scrolls the page down', async ({ page, isMobile }) => {
    const dashboard = await seedStack('Arrange scroll down', 8);
    await openEditor(page, dashboard.id);
    await page.evaluate(() => window.scrollTo(0, 0));

    const gripAt = await centerOf(page, card(page, 'W1').getByTestId('dashboard-drag-handle'));
    const startScroll = await page.evaluate(() => window.scrollY);
    const viewportHeight = page.viewportSize()!.height;

    await drag(page, isMobile, gripAt, { x: gripAt.x, y: viewportHeight - 20 }, 1500);

    const endScroll = await page.evaluate(() => window.scrollY);
    expect(endScroll).toBeGreaterThan(startScroll + 300);
    await expect.poll(async () => {
      const tops = await cardTops(page);
      return tops.W1 > tops.W2;
    }).toBe(true);
  });
});
