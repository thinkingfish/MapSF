import { test, expect } from '@playwright/test';
import { feed, clock } from './fixtures.mjs';

async function openCalendar(page, coverage = { dates: ['2026-09-06', '2026-09-08'] }) {
  await page.clock.install({time: clock});
  await page.route('**/events.json', route => route.fulfill({json: {...feed, coverage}}));
  await page.goto('/');
  await expect(page.locator('#event-list')).toHaveAttribute('aria-busy', 'false');
  await page.getByRole('button', {name: 'Choose event date', exact: true}).click();
}

test('checked empty dates are selectable while gaps, past and distant dates are disabled', async ({page}) => {
  await openCalendar(page);
  await expect(page.getByRole('button', {name: 'September 5, 2026 — not checked', exact:true})).toBeDisabled();
  await expect(page.getByRole('button', {name: 'September 7, 2026 — not checked', exact:true})).toBeDisabled();
  await page.getByRole('button', {name: 'September 8, 2026 — checked', exact:true}).click();
  await expect(page.locator('#event-calendar')).toBeHidden();
  await expect(page.locator('#day-label')).toContainText('SEP 8');
  await expect(page.locator('#event-list')).toContainText('No one-off events listed');
  await page.getByRole('button', {name:'Choose event date', exact:true}).click();
  await page.getByRole('button', {name:'Next month', exact:true}).click();
  await expect(page.getByRole('button', {name:'October 1, 2026 — not checked', exact:true})).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', {name:'Choose event date', exact:true})).toBeFocused();
});

test('missing or malformed coverage does not infer coverage from event dates or gardens', async ({page}) => {
  await openCalendar(page, {dates: ['2026-02-30', '2026-09-06junk', null]});
  await expect(page.getByRole('button', {name:'September 6, 2026 — not checked', exact:true})).toBeDisabled();
  await expect(page.locator('#today-button')).toBeDisabled();
  await expect(page.locator('#event-calendar')).toContainText('haven’t been checked');
});

test('calendar fits a narrow screen and checked days support keyboard selection', async ({page}) => {
  await page.setViewportSize({width:320,height:700});
  await openCalendar(page);
  const day = page.getByRole('button', {name:'September 8, 2026 — checked',exact:true});
  await day.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#day-label')).toContainText('SEP 8');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('calendar retains keyboard focus across the periodic event refresh', async ({page}) => {
  await openCalendar(page);
  await page.keyboard.press('Escape');
  await page.clock.fastForward(10 * 60 * 60 * 1000);
  await page.getByRole('button', {name:'Choose event date',exact:true}).click();
  const day = page.getByRole('button', {name:'September 8, 2026 — checked',exact:true});
  await day.focus();
  await page.clock.fastForward(60_000);
  await expect(day).toBeFocused();
});

test('dates beyond the 30-day window remain disabled even in an old or oversized feed', async ({page}) => {
  await openCalendar(page, {dates:['2026-09-06','2026-10-05','2026-10-06']});
  await page.getByRole('button', {name:'Next month',exact:true}).click();
  await expect(page.getByRole('button', {name:'October 5, 2026 — checked',exact:true})).toBeEnabled();
  await expect(page.getByRole('button', {name:'October 6, 2026 — not checked',exact:true})).toBeDisabled();
});
