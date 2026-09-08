import {test,expect} from './test.mjs';
import {feed,clock} from './fixtures.mjs';
test('scroll guidance stays steady with reduced motion and repeated blocked wheel gestures',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.clock.install({time:clock});
 await page.route('**/events.json',route=>route.fulfill({json:feed}));
 await page.goto('/');await expect(page.locator('#map-status')).toBeHidden();
 const canvas=page.locator('canvas.maplibregl-canvas');
 const hint=page.locator('.maplibregl-cooperative-gesture-screen');
 await canvas.dispatchEvent('wheel',{deltaY:80,bubbles:true,cancelable:true});
 await page.clock.fastForward(300);
 await expect(hint).toHaveCSS('opacity','1');
 await canvas.dispatchEvent('wheel',{deltaY:80,bubbles:true,cancelable:true});
 await page.clock.fastForward(900);
 await expect(hint).toHaveCSS('opacity','1');
 await expect(hint).toContainText('Ctrl');
 await page.clock.fastForward(800);
 await expect(hint).toHaveCSS('opacity','0');
});
