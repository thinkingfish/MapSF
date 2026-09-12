import {test,expect} from './test.mjs';
import {feed,clock} from './fixtures.mjs';
const snapshot=structuredClone(feed);
snapshot.events=snapshot.events.slice(0,1);
snapshot.events[0].curation.geometry.coordinates=[-122.4194,37.7599];
const outside=structuredClone(snapshot.events[0]);outside.id='outside-neighborhood';outside.title='Marina event';outside.curation.geometry.coordinates=[-122.438,37.803];snapshot.events.push(outside);
async function load(page){
 await page.emulateMedia({reducedMotion:'reduce'});await page.clock.install({time:clock});
 await page.route('**/events.json',r=>r.fulfill({json:snapshot}));await page.goto('/');
 await expect(page.locator('#neighborhood-filter')).toBeEnabled();await expect(page.locator('#map-status')).toBeHidden();
}
for(const [name,size] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]){
 test(`neighborhood selection filters and fits, reset restores city on ${name}`,async({page})=>{
  await page.setViewportSize(size);await load(page);
  await expect(page.locator('#neighborhood-layout')).toHaveValue('analysis');
  await expect(page.locator('#neighborhood-filter option')).toHaveCount(42);
  await page.locator('#neighborhood-filter').selectOption({label:'Mission'});
  await expect(page.locator('[data-event-id="point-event"]')).toHaveCount(1);
  await expect(page.locator('[data-event-id="outside-neighborhood"]')).toHaveCount(0);
  await expect(page.locator('#region-status')).toContainText('Mission');
  // The opaque teal selected outline should occupy a substantial part of the
  // map after fitting, not remain a tiny neighborhood in the city view.
  await expect.poll(async()=>{
   const buffer=await page.locator('#map canvas').screenshot();
   return page.evaluate(async base64=>{
    const bitmap=await createImageBitmap(await(await fetch('data:image/png;base64,'+base64)).blob());
    const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);
    const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;let minY=Infinity,maxY=-Infinity;
    for(let i=0;i<data.length;i+=4)if(Math.abs(data[i]-50)<7&&Math.abs(data[i+1]-124)<7&&Math.abs(data[i+2]-119)<7){const y=Math.floor(i/4/canvas.width);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
    return (maxY-minY)/canvas.height;
   },buffer.toString('base64'));
  }).toBeGreaterThan(0.45);
  // Zooming out cannot undo a geographic filter; explicit city reset can.
  await page.getByRole('button',{name:'Zoom out',exact:true}).click();
  await expect(page.locator('[data-event-id="outside-neighborhood"]')).toHaveCount(0);
  await page.getByRole('button',{name:'Show all of San Francisco',exact:true}).click();
  await expect(page.locator('#neighborhood-filter')).toHaveValue('');
  await expect(page.locator('[data-event-id="outside-neighborhood"]')).toHaveCount(1);
  await page.locator('#neighborhood-layout').selectOption('311');
  await expect(page.locator('#neighborhood-filter')).toBeEnabled();
  await expect(page.locator('#neighborhood-filter option')).toHaveCount(118);
  await page.locator('#neighborhood-layout').selectOption('notification');
  await expect(page.locator('#neighborhood-filter option')).toHaveCount(38);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`/tmp/mapsf-neighborhood-${name}.png`,fullPage:true});
 });
}
test('failed layout fetch retains previous selection and retries',async({page})=>{
 await load(page);await page.locator('#neighborhood-filter').selectOption({label:'Mission'});
 await page.route('**/notification.geojson',r=>r.fulfill({status:503,body:'unavailable'}));
 await page.locator('#neighborhood-layout').selectOption('notification');
 await expect(page.locator('#neighborhood-status')).toContainText('Could not load');
 await expect(page.locator('#neighborhood-layout')).toHaveValue('analysis');
 await expect(page.locator('#neighborhood-filter')).toHaveValue('analysis-mission');
 await expect(page.locator('[data-event-id="outside-neighborhood"]')).toHaveCount(0);
 await page.unroute('**/notification.geojson');await page.locator('#retry-neighborhoods').click();
 await expect(page.locator('#neighborhood-filter option')).toHaveCount(38);
 await expect(page.locator('#neighborhood-layout')).toHaveValue('notification');
});
