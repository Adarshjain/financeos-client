import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createDashboard, createReport, widget } from '../fixtures/seed/reports';
import { expect, test } from '../fixtures/test';

// Arranging a dashboard in edit mode: cards move only by their grip and a drag held near the
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

/** Each grid item's page-relative top, keyed by its id (w1..wn). */
async function cardTops(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('[data-widget-grid-item]')].map((item) => [
        item.getAttribute('data-widget-grid-item') as string,
        item.getBoundingClientRect().top + window.scrollY,
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
    await page.goto(`/dashboards/${dashboardId}?edit=1`);
    await expect(page.getByLabel('Dashboard name')).toBeVisible({ timeout: 45_000 });
    await expect(page.locator('[data-widget-grid-grip]').first()).toBeVisible({ timeout: 45_000 });
    // The grid first lays out at its default width and animates to the measured one; on a phone
    // the page is wider than the screen until then. Arrange only once it fits.
    const viewportWidth = page.viewportSize()!.width;
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(viewportWidth);
  }

  const card = (page: Page, id: string) => page.locator(`[data-widget-grid-item="${id}"]`);
  const grip = (page: Page, id: string) => page.locator(`[data-widget-grid-grip="${id}"]`);

  test('@mobile a card moves by its grip, never by its content', async ({ page, isMobile }) => {
    const dashboard = await seedStack('Arrange grip', 2);
    await openEditor(page, dashboard.id);
    const before = await cardTops(page);
    expect(before.w1).toBeLessThan(before.w2);

    // Dragging w1 by its content leaves the order alone.
    const contentAt = await centerOf(page, card(page, 'w1'));
    await drag(page, isMobile, contentAt, { x: contentAt.x, y: contentAt.y + 400 });
    const unmoved = await cardTops(page);
    expect(unmoved.w1).toBeLessThan(unmoved.w2);

    // Dragging w2 by its grip above w1 swaps them, and the drop commits.
    const gripAt = await centerOf(page, grip(page, 'w2'));
    const w1Box = (await card(page, 'w1').boundingBox())!;
    await drag(page, isMobile, gripAt, { x: w1Box.x + 20, y: w1Box.y + 20 }, 400);
    await expect.poll(async () => {
      const after = await cardTops(page);
      return after.w2 < after.w1;
    }).toBe(true);
    await expect(card(page, 'w2')).not.toHaveAttribute('style', /transform/);
    await expect(page.getByText('Unsaved changes')).toBeVisible();
  });

  test('@mobile a card dragged down past another one drops there and commits', async ({ page, isMobile }) => {
    const dashboard = await seedStack('Arrange down', 2);
    await openEditor(page, dashboard.id);
    const gripAt = await centerOf(page, grip(page, 'w1'));
    const w2Box = (await card(page, 'w2').boundingBox())!;
    await drag(page, isMobile, gripAt, { x: w2Box.x + w2Box.width * 0.75, y: w2Box.y + w2Box.height * 0.5 }, 400);
    await expect(card(page, 'w1')).not.toHaveAttribute('style', /transform/);
    await expect(page.getByText('Unsaved changes')).toBeVisible();
    const after = await cardTops(page);
    expect(after.w1).toBeGreaterThan(after.w2);
  });

  test('@mobile holding a dragged card at the top edge scrolls the page up and carries the card along', async ({ page, isMobile }) => {
    const dashboard = await seedStack('Arrange scroll up', 8);
    await openEditor(page, dashboard.id);

    const gripAt = await centerOf(page, grip(page, 'w8'));
    const startScroll = await page.evaluate(() => window.scrollY);
    expect(startScroll).toBeGreaterThan(300);

    await drag(page, isMobile, gripAt, { x: gripAt.x, y: 20 }, 1500);

    const endScroll = await page.evaluate(() => window.scrollY);
    expect(endScroll).toBeLessThan(startScroll - 300);
    // The card followed the page up past its neighbour.
    await expect.poll(async () => {
      const tops = await cardTops(page);
      return tops.w8 < tops.w7;
    }).toBe(true);
  });

  test('@mobile holding a dragged card at the bottom edge scrolls the page down', async ({ page, isMobile }) => {
    const dashboard = await seedStack('Arrange scroll down', 8);
    await openEditor(page, dashboard.id);
    await page.evaluate(() => window.scrollTo(0, 0));

    const gripAt = await centerOf(page, grip(page, 'w1'));
    const startScroll = await page.evaluate(() => window.scrollY);
    const viewportHeight = page.viewportSize()!.height;

    await drag(page, isMobile, gripAt, { x: gripAt.x + 300, y: viewportHeight - 20 }, 1500);

    const endScroll = await page.evaluate(() => window.scrollY);
    expect(endScroll).toBeGreaterThan(startScroll + 300);
    await expect.poll(async () => {
      const tops = await cardTops(page);
      return tops.w1 > tops.w2;
    }).toBe(true);
  });
});
