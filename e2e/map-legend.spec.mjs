import {test, expect} from './test.mjs';
import {feed, clock} from './fixtures.mjs';

for (const viewport of [{width:1440,height:900}, {width:390,height:844}, {width:320,height:700}]) {
  test(`legend stays below the map at ${viewport.width}px`, async ({page}) => {
    await page.setViewportSize(viewport);
    await page.clock.install({time:clock});
    await page.route('**/events.json', route => route.fulfill({json:feed}));
    await page.goto('/');
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
    const map = await page.locator('#map').boundingBox();
    const legend = await page.getByLabel('Map legend', {exact:true}).boundingBox();
    const panel = await page.locator('#map-panel').boundingBox();
    expect(legend.y).toBeGreaterThanOrEqual(map.y + map.height);
    expect(legend.y + legend.height).toBeLessThanOrEqual(panel.y + panel.height);
    expect(legend.x).toBeGreaterThanOrEqual(0);
    expect(legend.x + legend.width).toBeLessThanOrEqual(viewport.width);
    if (viewport.width <= 760) expect(map.height).toBeGreaterThanOrEqual(420);
    await expect(page.locator('.maplibregl-ctrl-attrib a', {hasText:'OpenStreetMap'})).toBeVisible();
  });
}
