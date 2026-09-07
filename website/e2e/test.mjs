import { test as base, expect } from '@playwright/test';
// Automated browsing must never fetch or pan through the community tile service.
const tile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAALUlEQVR4AeyTsQ0AAAjCCP9f6mD8QOMNDCyQsDI0lDW9SgkxGQDCIAxeI/8PDgAA//9lCVeGAAAABklEQVQDAC/yPJEMiKmVAAAAAElFTkSuQmCC', 'base64');
export const test = base.extend({page: async ({page}, use) => {
  await page.route('https://tile.openstreetmap.org/**', route => route.fulfill({contentType:'image/png',body:tile}));
  await use(page);
}});
export { expect };
