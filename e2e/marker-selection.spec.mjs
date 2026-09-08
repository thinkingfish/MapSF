import {test,expect} from './test.mjs';
import {feed,clock} from './fixtures.mjs';

async function selectedPixels(page) {
 const buffer=await page.locator('canvas.maplibregl-canvas').screenshot();
 return page.evaluate(async base64=>{
  const bitmap=await createImageBitmap(await(await fetch('data:image/png;base64,'+base64)).blob());
  const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
  const context=canvas.getContext('2d');context.drawImage(bitmap,0,0);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
  let count=0;
  for(let i=0;i<pixels.length;i+=4) if(Math.abs(pixels[i]-181)<8 && Math.abs(pixels[i+1]-68)<8 && Math.abs(pixels[i+2]-100)<8) count++;
  return count;
 },buffer.toString('base64'));
}

test('selected point stays deep pink above other events at the same location',async({page})=>{
 await page.clock.install({time:clock});
 await page.emulateMedia({reducedMotion:'reduce'});
 const snapshot=structuredClone(feed);
 snapshot.events=['A','B'].map(letter=>({...feed.events[0],id:`overlap-${letter}`,title:`${letter}: same venue`,source:{...feed.events[0].source,url:`https://sfpl.org/events/overlap-${letter}`}}));
 await page.route('**/events.json',route=>route.fulfill({json:snapshot}));
 await page.goto('/');await expect(page.locator('#map-status')).toBeHidden();
 for(const letter of ['A','B','A']) {
  await page.locator(`[data-event-id="overlap-${letter}"] button`).click();
  await expect.poll(()=>selectedPixels(page)).toBeGreaterThan(100);
 }
 await page.locator('[data-event-id="overlap-A"] button').click();
 await expect.poll(()=>selectedPixels(page)).toBe(0);
});
