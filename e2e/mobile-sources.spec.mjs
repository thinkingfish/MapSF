import {test,expect} from './test.mjs';
import {feed,clock} from './fixtures.mjs';

const names=['Civic Joy Fund','Mission Local','San Francisco Chronicle','San Francisco Public Library','San Francisco Recreation and Parks'];
async function loadSources(page) {
  const snapshot=structuredClone(feed);
  snapshot.coverage.dates.push('2026-09-07');
  snapshot.sources=names.map((name,i)=>({id:`source-${i}`,name,status:'ok',lastSuccessfulAt:snapshot.generatedAt}));
  // Only two publishers have events today. The others must remain available.
  snapshot.events=names.map((name,i)=>({...structuredClone(feed.events[0]),id:`event-${i}`,title:`Event from ${name}`,
    source:{id:`source-${i}`,name,url:`https://example.com/${i}`},
    startAt:`2026-09-${i<2?'06':'07'}T13:00:00-07:00`,endAt:`2026-09-${i<2?'06':'07'}T18:00:00-07:00`}));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.clock.install({time:clock});
  await page.route('**/events.json',route=>route.fulfill({json:snapshot}));
  await page.goto('/');
  await expect(page.locator('#event-list')).toHaveAttribute('aria-busy','false');
  await page.locator('#source-filter').click();
}

for(const [name,viewport] of [['mobile',{width:320,height:568}],['desktop',{width:1280,height:800}]]) {
 test(`all event sources are checked and reachable on ${name}, including sources with no events today`,async({page})=>{
  await page.setViewportSize(viewport);
  await loadSources(page);
  await expect(page.locator('#source-options input')).toHaveCount(5);
  await expect(page.locator('#all-sources')).toHaveCount(0);
  for(const source of names) await expect(page.getByRole('checkbox',{name:source,exact:true})).toBeChecked();
  const menu=page.locator('#source-menu');
  const bounds=await menu.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y+bounds.height).toBeLessThanOrEqual(viewport.height);
  const last=page.getByRole('checkbox',{name:names.at(-1),exact:true});
  await last.uncheck();await expect(last).not.toBeChecked();
  await expect(last).toBeInViewport();
  if(name==='mobile') {
    await page.setViewportSize({width:568,height:320});
    await expect.poll(async()=>{
      const box=await menu.boundingBox();
      return box.y>=0 && box.y+box.height<=320 && box.x>=0 && box.x+box.width<=568;
    }).toBe(true);
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    await expect(last).not.toBeChecked();
  }
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Tomorrow',exact:true}).click();
  await expect(page.locator('[data-event-id="event-4"]')).toHaveCount(0);
  await expect(page.locator('[data-event-id="event-2"]')).toHaveCount(1);
 });
}

test('deselecting every publisher shows no Events and preserves Free Places',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await loadSources(page);
 for(const source of names) await page.getByRole('checkbox',{name:source,exact:true}).uncheck();
 await expect(page.locator('#source-filter')).toHaveText('No sources');
 await expect(page.locator('#events-entries article')).toHaveCount(0);
 await expect(page.locator('#places-entries article')).toHaveCount(4);
 await page.getByRole('checkbox',{name:names[0],exact:true}).check();
 await expect(page.locator('#events-entries article')).toHaveCount(1);
 await page.keyboard.press('Escape');
 await expect(page.locator('#source-filter')).toBeFocused();
});
