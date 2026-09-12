import { test, expect } from './test.mjs';
import { feed, clock } from './fixtures.mjs';

// Capture the actual production Map instance at construction in the served JS.
// Instrumentation stays in the test; the app has no debug globals or fake map.
async function inspectMap(page) {
  await page.route('**/_astro/*.js', async route => {
    const response = await route.fetch();
    const source = await response.text();
    await route.fulfill({ response, body: source.replace(/new ([\w$]+)\(\{container:[`"']map[`"']/, match => `window.__testedMap=${match}`) });
  });
}

test('local vector tiles and glyphs render streets and neighbourhoods through pan and overzoom', async ({ page }) => {
  const external = [];
  const failedAssets = [];
  const assets = [];
  await page.route('https://**', route => { external.push(route.request().url()); return route.abort(); });
  page.on('response', response => {
    if (response.url().includes('/basemap/')) {
      assets.push(response.url());
      if (!response.ok()) failedAssets.push(`${response.status()} ${response.url()}`);
    }
  });
  await inspectMap(page);
  await page.clock.install({ time: clock });
  await page.route('**/events.json', route => route.fulfill({ json: feed }));
  await page.goto('/');
  await expect(page.locator('#map-status')).toBeHidden({ timeout: 20000 });
  await expect.poll(() => page.evaluate(() => window.__testedMap?.getSource('basemap')?.type)).toBe('vector');
  await expect.poll(() => page.evaluate(() => window.__testedMap.queryRenderedFeatures({ layers: ['neighbourhood-labels'] }).filter(f => f.properties.name).length)).toBeGreaterThan(0);
  await page.locator('#map-panel').screenshot({ path: '/tmp/mapsf-vector-city.png' });
  await page.evaluate(() => window.__testedMap.jumpTo({ center: [-122.4194, 37.7599], zoom: 15 }));
  await expect.poll(() => page.evaluate(() => window.__testedMap.queryRenderedFeatures({ layers: ['road-labels', 'minor-road-labels'] }).some(f => /Valencia|Mission|Street/.test(f.properties.name)))).toBe(true);
  await page.locator('#map-panel').screenshot({ path: '/tmp/mapsf-vector-streets.png' });
  await page.evaluate(() => window.__testedMap.jumpTo({ center: [-122.4534, 37.7694], zoom: 18 }));
  await expect.poll(() => page.evaluate(() => window.__testedMap.areTilesLoaded())).toBe(true);
  expect(await page.evaluate(() => window.__testedMap.queryRenderedFeatures({ layers: ['roads-minor', 'roads-major'] }).length)).toBeGreaterThan(0);
  // Attempts to leave the regional extract are constrained to available coverage.
  await page.evaluate(() => window.__testedMap.jumpTo({ center: [-121, 38.8], zoom: 15 }));
  await expect.poll(() => page.evaluate(() => window.__testedMap.areTilesLoaded())).toBe(true);
  const view = await page.evaluate(() => ({ bounds: window.__testedMap.getBounds().toArray(), limit: window.__testedMap.getMaxBounds().toArray() }));
  expect(view.bounds[0][0]).toBeGreaterThanOrEqual(view.limit[0][0] - 0.00001);
  expect(view.bounds[0][1]).toBeGreaterThanOrEqual(view.limit[0][1] - 0.00001);
  expect(view.bounds[1][0]).toBeLessThanOrEqual(view.limit[1][0] + 0.00001);
  expect(view.bounds[1][1]).toBeLessThanOrEqual(view.limit[1][1] + 0.00001);
  expect(assets.some(url => url.includes('/fonts/'))).toBe(true);
  expect(assets.some(url => /\/15\/\d+\/\d+\.pbf$/.test(url))).toBe(true);
  expect(failedAssets).toEqual([]);
  expect(external).toEqual([]);
  await expect(page.locator('#map-status')).toBeHidden();
});

test('Free Places gardens render as areas with directions to their main entrances', async ({ page }) => {
  await inspectMap(page);
  await page.clock.install({ time: clock });
  await page.route('**/events.json', route => route.fulfill({ json: feed }));
  await page.goto('/');
  await expect(page.locator('#map-status')).toBeHidden({ timeout: 20000 });
  await page.evaluate(() => window.__testedMap.jumpTo({center: [-122.4705, 37.7685], zoom: 14}));
  await page.locator('#places-toggle').click();
  for (const [id, coordinate] of [['sf-botanical-garden','37.767047%2C-122.4667863'], ['japanese-tea-garden','37.7702263%2C-122.4695479']]) {
    await expect.poll(() => page.evaluate(id => window.__testedMap.queryRenderedFeatures({ layers: ['event-areas'] }).some(f => String(f.properties.eventId).includes(id)), id)).toBe(true);
    const card = page.locator(`article[data-event-id*="${id}"]`);
    await card.locator('.event-select').click();
    await expect(card.getByRole('link', {name: 'Directions to main entrance'})).toHaveAttribute('href', `https://www.google.com/maps/dir/?api=1&destination=${coordinate}`);
    await expect(card.locator('.event-details')).toContainText('Area');
  }
  await page.locator('#map-panel').screenshot({path:'/tmp/mapsf-garden-areas.png'});
});
