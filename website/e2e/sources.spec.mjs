import {test, expect} from './test.mjs';
import {sourceGuide} from '../config/source-guide.mjs';
import {feed, clock} from './fixtures.mjs';
test('footer links every source to its description and explains planned sources and collection',async({page})=>{
 await page.clock.install({time:clock});await page.route('**/events.json',r=>r.fulfill({json:feed}));await page.goto('/');
 const footer=page.getByRole('contentinfo');
 for(const source of sourceGuide)await expect(footer.getByRole('link',{name:source.name,exact:true})).toHaveAttribute('href',`/sources/#${source.id}`);
 await footer.getByRole('link',{name:'Civic Joy Fund',exact:true}).click();
 await expect(page.locator('#civic-joy-fund')).toContainText('Planned');
 await expect(page.locator('#sfpl')).toContainText('Collecting events');
 const rss = page.getByRole('region', {name:'Subscribe via RSS'});
 await expect(rss.getByRole('link')).toHaveCount(6);
 await expect(rss.getByRole('link', {name:'Mission Local RSS',exact:true})).toHaveAttribute('href','https://missionlocal.org/events/feed/');
 await expect(rss).toContainText('Neighborhood news');
 await expect(rss).toContainText('paste it into your reader');
 await expect(page.locator('#methodology')).toContainText('30-day window');
 await expect(page.locator('#methodology')).toContainText('scraping');
 await expect(page.locator('#methodology')).toContainText('Cost not listed');
 await page.setViewportSize({width:320,height:700});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('OpenStreetMap attribution remains visible without opening a toggle',async({page})=>{
 await page.setViewportSize({width:320,height:700});await page.route('**/events.json',r=>r.fulfill({json:feed}));await page.goto('/');
 await expect(page.locator('.maplibregl-ctrl-attrib a', {hasText:'OpenStreetMap'})).toBeVisible();
 await expect(page.locator('.maplibregl-ctrl-attrib')).not.toHaveClass(/maplibregl-compact/);
});
