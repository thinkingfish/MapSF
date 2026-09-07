import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { historicalFeed, sourceUrl } from './bay-to-breakers-fixture.mjs';

// Read actual screenshot pixels, without exposing a map instance or adding app hooks.
async function routePixels(page, buffer) {
  return page.evaluate(async base64 => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = new Set();
    for (let p = 0; p < data.length / 4; p++) {
      const [r,g,b] = data.slice(p*4,p*4+3);
      if (Math.abs(r-174)<18 && Math.abs(g-63)<18 && Math.abs(b-97)<18) pixels.add(p);
    }
    // Existing place circles sit above the route. Bridge their <=22px diameter,
    // while preserving actual dark-route pixels for bounds and click coordinates.
    const neighbors=[];
    for(let dy=-22;dy<=22;dy++) for(let dx=-22;dx<=22;dx++)
      if(dx*dx+dy*dy<=22*22) neighbors.push(dy*canvas.width+dx);
    let largest = [];
    while (pixels.size) {
      const todo = [pixels.values().next().value], component = [];
      pixels.delete(todo[0]);
      while (todo.length) {
        const p = todo.pop(); component.push(p);
        for (const d of neighbors) {
          if (pixels.delete(p+d)) todo.push(p+d);
        }
      }
      if (component.length > largest.length) largest = component;
    }
    const xs = largest.map(p => p%canvas.width), ys = largest.map(p => Math.floor(p/canvas.width));
    const routeSet=new Set(largest);
    const interior=largest.filter(p=>[-canvas.width-1,-canvas.width,-canvas.width+1,-1,1,canvas.width-1,canvas.width,canvas.width+1].every(d=>routeSet.has(p+d)));
    const middle=interior.sort((a,b)=>Math.abs(a%canvas.width-canvas.width*.75)-Math.abs(b%canvas.width-canvas.width*.75))[0];
    return { count:largest.length, left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys),width:canvas.width,height:canvas.height,click:{x:middle%canvas.width,y:Math.floor(middle/canvas.width)} };
  }, buffer.toString('base64'));
}

for (const [name, viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]) {
  test(`historical Bay to Breakers route renders continuously and fits on ${name}`, async ({page}, testInfo) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.clock.install({time:new Date('2026-05-17T14:00:00Z')});
    await page.route('**/events.json', route=>route.fulfill({json:historicalFeed}));
    // CI uses local tiles; opt into real tiles for a visual review.
    if (process.env.B2B_REAL_TILES !== '1') await page.route('https://tile.openstreetmap.org/**',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAALUlEQVR4AeyTsQ0AAAjCCP9f6mD8QOMNDCyQsDI0lDW9SgkxGQDCIAxeI/8PDgAA//9lCVeGAAAABklEQVQDAC/yPJEMiKmVAAAAAElFTkSuQmCC','base64')}));
    await page.goto('/');
    const card=page.locator('[data-event-id="historical-bay-to-breakers-2026"]');
    await expect(card).toBeVisible();
    await expect(page.locator('#map-status')).toBeHidden({timeout:20000});
    if (await card.locator('button').getAttribute('aria-expanded') === 'true') await card.locator('button').click();
    await card.locator('button').click();
    await expect(card.locator('button')).toHaveAttribute('aria-expanded','true');
    await expect(card).toContainText('Approximate');
    await expect(card.getByRole('link')).toHaveAttribute('href',sourceUrl);
    const map=page.locator('canvas.maplibregl-canvas');
    await map.scrollIntoViewIfNeeded();
    let pixels;
    await expect.poll(async()=>{
      pixels=await routePixels(page,await map.screenshot());
      return pixels.count;
    }).toBeGreaterThan(300);
    // The connected course (allowing place-marker occlusion) spans the map with padding.
    expect(pixels.right-pixels.left).toBeGreaterThan(pixels.width*.5);
    expect(pixels.left).toBeGreaterThan(35);
    expect(pixels.width-pixels.right).toBeGreaterThan(35);
    expect(pixels.top).toBeGreaterThan(35);
    expect(pixels.height-pixels.bottom).toBeGreaterThan(35);
    await page.screenshot({path:`/tmp/bay-to-breakers-${name}.png`,fullPage:true});
    await testInfo.attach(`${name}-route-evidence`,{body:await map.screenshot(),contentType:'image/png'});
    await writeFile(`/tmp/bay-to-breakers-${name}-pixels.json`,JSON.stringify(pixels,null,2));
    await testInfo.attach(`${name}-route-pixels`,{body:Buffer.from(JSON.stringify(pixels,null,2)),contentType:'application/json'});
    await card.locator('button').click();
    await expect(card.locator('button')).toHaveAttribute('aria-expanded','false');
    await map.click({position:pixels.click});
    await expect(card.locator('button')).toHaveAttribute('aria-expanded','true');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
}
