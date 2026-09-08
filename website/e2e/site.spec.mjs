import { test, expect } from './test.mjs';
import { feed, clock } from './fixtures.mjs';

async function load(page, snapshot = feed) {
  await page.clock.install({ time: clock });
  await page.route('**/events.json', route => route.fulfill({ json: snapshot }));
  await page.goto('/');
  await expect(page.locator('#event-list')).toHaveAttribute('aria-busy', 'false');
}

test('SF today, free filter and all geometry types work in another timezone', async ({ page }) => {
  await load(page);
  await expect(page.getByLabel('Choose event date')).toHaveText('September 6, 2026');
  for (const event of feed.events) await expect(page.locator('#event-list')).toContainText(event.title);
  await page.getByLabel('Free only').check();
  await expect(page.locator('#event-list')).toContainText(feed.events[0].title);
  await expect(page.locator('#event-list')).not.toContainText(feed.events[1].title);
  await expect(page.locator('#event-list')).not.toContainText(feed.events[2].title);
  await page.getByLabel('Free only').uncheck();
  await expect(page.locator('[data-geometry]')).toHaveCount(0);
  await expect(page.getByRole('searchbox')).toHaveCount(0);
});

test('unpublished feed is honest and map failure leaves a usable list', async ({ page }) => {
  await page.route('**/basemap/**/*.pbf', route => route.abort());
  await load(page, { schemaVersion: 1, generatedAt: null, coverage: {dates: ['2026-09-06']}, sources: [], events: [] });
  await expect(page.locator('#event-list')).toContainText('No one-off events listed for this day.');
  await expect(page.locator('#event-list')).not.toContainText('Example:');
  await page.unroute('**/events.json');
  await page.route('**/events.json', route => route.fulfill({ json: feed }));
  await page.reload();
  await expect(page.locator('#event-list')).toContainText(feed.events[0].title);
  await expect(page.locator('#map-status')).toContainText('trouble loading');
});

test('mobile layout fits viewport and Map/List controls move focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await load(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.locator('#event-results')).toBeFocused();
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.locator('#map-panel')).toBeFocused();
});

test('production map renderer loads and event selection exposes source details', async ({ page }) => {
  const timedFeed = structuredClone(feed);
  timedFeed.events[0].startAt = '2026-09-06T11:00:00-07:00';
  timedFeed.events[0].endAt = '2026-09-06T12:00:30-07:00';
  await load(page, timedFeed);
  await expect(page.locator('#event-list article button[aria-expanded="true"]')).toHaveCount(0);
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
  await expect(page.locator('#map-status')).toBeHidden({ timeout: 15000 });
  await page.clock.fastForward(60_000);
  await expect(page.locator('#event-list article button[aria-expanded="true"]')).toHaveCount(0);
  const route = page.locator('article[data-event-id="route-event"]');
  await route.locator('button').click();
  await expect(route.locator('button')).toHaveAttribute('aria-expanded', 'true');
  await route.locator('button').click();
  await expect(route.locator('button')).toHaveAttribute('aria-expanded', 'false');
  await page.clock.fastForward(60_000);
  await expect(route.locator('button')).toHaveAttribute('aria-expanded', 'false');
  await route.locator('button').click();
  await expect(route.locator('button')).toHaveAttribute('aria-expanded', 'true');
  await expect(route.getByRole('link')).toHaveAttribute('href', feed.events[1].source.url);
  await expect(route).toContainText('Embarcadero route');
  const area = page.locator('article[data-event-id="area-event"]');
  await area.locator('button').click();
  await expect(area.locator('button')).toHaveAttribute('aria-expanded', 'true');
  await expect(route.locator('button')).toHaveAttribute('aria-expanded', 'false');
});


test('recurring places follow one-offs and clearly state resident eligibility', async ({ page }) => {
  await load(page);
  const cards = page.locator('#event-list article');
  expect(await cards.evaluateAll(nodes => nodes.map(n => n.dataset.recurring === 'true'))).toEqual([false, false, false, true, true, true, true]);
  await expect(page.locator('[data-recurring]').filter({ hasText: 'Botanical' })).toContainText('bring ID or proof of residency');
  await page.clock.fastForward(10 * 60 * 60 * 1000);
  await expect(page.locator('[data-recurring]').first()).toContainText('Entry has ended today.');
});

test('failed event feed keeps recurring places and supports retry', async ({ page }) => {
  await page.clock.install({ time: clock });
  await page.route('**/events.json', route => route.abort());
  await page.goto('/');
  await expect(page.locator('[data-recurring]')).toHaveCount(4);
  await expect(page.locator('#event-list')).not.toContainText('No one-off events listed');
  await page.unroute('**/events.json');
  await page.route('**/events.json', route => route.fulfill({ json: feed }));
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('#event-list')).toContainText(feed.events[0].title);
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toHaveCount(0);
});
