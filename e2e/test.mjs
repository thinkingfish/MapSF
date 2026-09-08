import { test as base, expect } from '@playwright/test';
// Production maps are served locally. Never allow automated tests to contact
// third-party map services if a source or glyph URL accidentally regresses.
export const test = base.extend({ page: async ({ page }, use) => {
  await page.route('https://**', route => route.abort());
  await use(page);
} });
export { expect };
