import {test, expect} from './test.mjs';
import {farmersMarkets} from '../config/farmers-markets.mjs';
import {sources} from '../config/sources.mjs';
import {collectFarmersMarket} from '../scripts/adapters/farmers-markets.mjs';
import {normalizeJsonLd} from '../scripts/refresh-events.mjs';
const now=new Date('2026-09-13T17:00:00Z');
const marketSources=sources.filter(s=>s.adapter==='farmers-market');
const events=(await Promise.all(marketSources.map(async source=>{
 const m=farmersMarkets.find(m=>source.id==='market-'+m.id);
 const raw=await collectFarmersMarket(source,async()=>({ok:true,text:async()=>'<main>'+m.checks.join(' ')+'</main>'}),now);
 return raw.map(row=>normalizeJsonLd(source,row));
}))).flat();

test('markets appear in Events on mobile without adding single-series source filters',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.clock.install({time:now});
 await page.route('**/events.json',r=>r.fulfill({json:{schemaVersion:1,generatedAt:now.toISOString(),coverage:{dates:['2026-09-13']},sources:marketSources.map(s=>({...s,status:'ok',lastSuccessfulAt:now.toISOString()})),events}}));
 await page.goto('/');
 await expect(page.locator('#map-status')).toBeHidden({timeout:20000});
 const card=page.locator('article[data-event-id^="market-outer-sunset:"]');
 await expect(card).toHaveCount(1);
 await card.locator('.event-select').click();
 await expect(card.locator('.event-details')).toContainText('purchases cost extra');
 await expect(card.locator('.event-details')).toContainText('Route');
 await expect(card.getByRole('link',{name:/Details for/})).toHaveAttribute('href','https://sunsetmercantilesf.com/osfmm/');
 await expect(page.locator('#events-entries')).toContainText('Fort Mason Center Farmers Market');
 await expect(page.locator('#places-entries')).not.toContainText('Farmers Market');
 await expect(page.getByRole('checkbox',{name:/Outer Sunset|Fort Mason|Clement/})).toHaveCount(0);
 await page.screenshot({path:'/tmp/mapsf-farmers-markets-mobile.png',fullPage:true});
 await page.goto('/sources/#market-outer-sunset');
 await expect(page.locator('#market-outer-sunset')).toContainText('Reviewed weekly schedule');
 await expect(page.locator('#market-outer-sunset')).toContainText('30 days');
});
