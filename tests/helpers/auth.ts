import { Page, expect } from '@playwright/test';

export async function adminLogin(page: Page, url: string, email: string, password: string) {
  await page.goto(url);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for either dashboard or specific sidebar elements we just added
  await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 15000 });
}

export async function waitForStableNetwork(page: Page) {
  await page.waitForLoadState('networkidle');
}
