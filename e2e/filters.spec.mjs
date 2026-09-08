import {test,expect} from './test.mjs';
import {feed,clock} from './fixtures.mjs';
async function load(page) {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.clock.install({time:clock});
  const snapshot=structuredClone(feed);
  snapshot.events[1].source={id:'mission-local',name:'Mission Local',url:'https://missionlocal.org/events/example'};
  await page.route('**/events.json',route=>route.fulfill({json:snapshot}));
  await page.goto('/');
  await expect(page.locator('#event-list')).toHaveAttribute('aria-busy','false');
}
test('source filter combines with Free only and can recover from no matches',async({page})=>{
  await load(page);
  await page.locator('#source-filter').click();
  await page.getByRole('checkbox',{name:'SF Public Library',exact:true}).uncheck();
  await page.keyboard.press('Escape');
  await expect(page.locator('#events-entries article')).toHaveCount(1);
  await expect(page.locator('#event-list')).toContainText(feed.events[1].title);
  await page.getByLabel('Free only').check();
  await expect(page.locator('#event-list')).toContainText('Nothing quite matches');
  await page.getByRole('button',{name:'Clear filters',exact:true}).click();
  await expect(page.locator('#source-filter')).toHaveText('All sources');
  for(const event of feed.events) await expect(page.locator('#event-list')).toContainText(event.title);
  await page.setViewportSize({width:320,height:700});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
for (const [name, viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]) {
 test(`map automatically filters after zooming and city reset on ${name}`,async({page})=>{
  await page.setViewportSize(viewport);
  await load(page);
  await expect(page.locator('#map-status')).toBeHidden();
  await expect(page.getByRole('button',{name:'Search this map',exact:true})).toHaveCount(0);
  await page.locator('[data-event-id="point-event"] button').click();
  // Selecting details must leave the city viewport and its other results intact.
  for(const event of feed.events) await expect(page.locator('#event-list')).toContainText(event.title);
  const zoom = page.getByRole('button',{name:'Zoom in',exact:true});
  for(let i=0;i<4;i++) await zoom.click();
  await expect(page.locator('[data-event-id="route-event"]')).toHaveCount(0);
  await expect(page.locator('[data-event-id="point-event"]')).toHaveCount(0);
  await expect(page.locator('#region-status')).toContainText('current map view');
  await page.getByRole('button',{name:'Show all of San Francisco',exact:true}).click();
  for(const event of feed.events) await expect(page.locator('#event-list')).toContainText(event.title);
 });
}

for(const [name,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]) {
 test(`Events and Free Places are matching accordion sections on ${name}`,async({page})=>{
  await page.setViewportSize(viewport);
  await load(page);
  if(name==='mobile') await page.locator('#event-results').scrollIntoViewIfNeeded();
  const events=page.getByRole('button',{name:'Events',exact:true});
  const places=page.getByRole('button',{name:'Free Places',exact:true});
  await expect(events).toBeInViewport();await expect(places).toBeInViewport();
  await expect(page.locator('#places-entries')).toBeHidden();
  await places.click();
  await expect(events).toHaveAttribute('aria-expanded','false');
  await expect(page.locator('#events-entries')).toBeHidden();
  await expect(page.locator('#places-entries')).toBeVisible();
  await places.click();
  await expect(page.locator('#places-entries')).toBeHidden();
  await events.click();
  await expect(page.locator('#events-entries')).toBeVisible();
  await expect(page.locator('#places-entries')).toBeHidden();
  await page.getByLabel('Free only').check();
  await expect(places).toHaveAttribute('aria-expanded','false');
  await places.focus();await page.keyboard.press('Enter');
  await expect(page.locator('#places-entries')).toBeVisible();
  await expect(page.locator('#events-entries')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}

 test('checked sources can be excluded and restored individually',async({page})=>{
  await load(page);
  await page.locator('#source-filter').click();
  await expect(page.getByRole('checkbox',{name:'Mission Local',exact:true})).toBeChecked();
  await expect(page.getByRole('checkbox',{name:'SF Public Library',exact:true})).toBeChecked();
  await expect(page.locator('#source-filter')).toHaveText('All sources');
  for(const event of feed.events) await expect(page.locator('#event-list')).toContainText(event.title);
  await expect(page.locator('#event-list [data-recurring]')).toHaveCount(4);
  await expect(page.getByRole('checkbox',{name:'Gardens of Golden Gate Park',exact:true})).toHaveCount(0);
  await page.getByRole('checkbox',{name:'Mission Local',exact:true}).uncheck();
  await expect(page.locator('[data-event-id="route-event"]')).toHaveCount(0);
  await page.getByRole('checkbox',{name:'Mission Local',exact:true}).check();
  await expect(page.getByRole('checkbox',{name:'SF Public Library',exact:true})).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(page.locator('#source-filter')).toBeFocused();
  await expect(page.locator('[data-event-id="route-event"]')).toHaveCount(1);
 });
