import { test, expect } from './test.mjs';
import { feed } from './fixtures.mjs';
for (const width of [390, 1280]) test(`time filter overlaps periods and resets at ${width}px`, async ({page}) => {
  await page.setViewportSize({width,height:900});
  await page.clock.install({time:new Date('2026-09-06T14:00:00Z')}); // 7am SF; browser is in Tokyo.
  const snapshot = structuredClone(feed);
  const hours = [['09:00','12:00'],['11:00','19:00'],['18:00','22:00']];
  snapshot.events.forEach((event,i) => {
    event.startAt = `2026-09-06T${hours[i][0]}:00-07:00`;
    event.endAt = `2026-09-06T${hours[i][1]}:00-07:00`;
  });
  await page.route('**/events.json',route=>route.fulfill({json:snapshot}));
  await page.goto('/');
  const time = page.getByRole('combobox',{name:'Time',exact:true});
  const ids = () => page.locator('#events-entries article').evaluateAll(nodes=>nodes.map(n=>n.dataset.eventId));
  await expect(page.locator('#events-entries article')).toHaveCount(3);
  await time.selectOption('morning');
  await expect.poll(ids).toEqual(['point-event','route-event']);
  await time.selectOption('afternoon');
  await expect.poll(ids).toEqual(['route-event']);
  await time.selectOption('evening');
  await expect.poll(ids).toEqual(['route-event','area-event']);
  await page.getByLabel('Free only').check();
  await expect(page.locator('#events-entries')).toContainText('Nothing quite matches');
  await page.getByRole('button',{name:'Clear filters',exact:true}).click();
  await expect(time).toHaveValue('');
  await expect(page.locator('#events-entries article')).toHaveCount(3);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
