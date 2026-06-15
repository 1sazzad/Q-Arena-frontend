import { test, expect } from '@playwright/test';

test('Q Arena homepage loads successfully', async ({ page }) => {
  const pageErrors = [];

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await page.goto('http://localhost:5173/', {
    waitUntil: 'domcontentloaded',
  });

  await expect(page.locator('body')).toBeVisible();

  await expect(page.getByText(/Q\s*Arena/i).first()).toBeVisible({
    timeout: 10000,
  });

  expect(pageErrors).toEqual([]);
});