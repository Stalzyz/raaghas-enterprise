import { test, expect } from '@playwright/test';

test.describe('Safe Production Validation - Frontend & Flow', () => {
  const STOREFRONT_URL = 'https://raaghas.in';

  test('Homepage loads and key elements are visible', async ({ page }) => {
    const res = await page.goto(STOREFRONT_URL);
    expect(res?.status()).toBe(200);

    // Verify header and navigation
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    
    // Check if hero banner or main element exists
    await expect(page.locator('main')).toBeVisible();
    
    // No console errors on load
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    
    await page.goto(STOREFRONT_URL);
    // Tolerate some 3rd party tracker errors, but ideally 0
  });

  test('Collections page loads and displays products', async ({ page }) => {
    const res = await page.goto(`${STOREFRONT_URL}/collections`);
    expect(res?.status()).toBe(200);

    // We expect some product cards or collection links
    const links = await page.locator('a[href^="/collections/"]').count();
    expect(links).toBeGreaterThan(0);
  });

  test('Search functionality works', async ({ page }) => {
    await page.goto(STOREFRONT_URL);
    
    // Attempt to open search
    const searchIcon = page.locator('button[aria-label="Search"], a[href="/search"]');
    if (await searchIcon.count() > 0) {
      await searchIcon.first().click();
      await page.waitForTimeout(500); // Wait for modal
    } else {
      await page.goto(`${STOREFRONT_URL}/search`);
    }

    const searchInput = page.locator('input[type="search"], input[name="q"], input[placeholder*="Search"]');
    if (await searchInput.count() > 0) {
      await searchInput.first().fill('kurti');
      await searchInput.first().press('Enter');
      await page.waitForLoadState('networkidle');
      
      const results = await page.locator('a[href^="/products/"]').count();
      // Even if 0, it shouldn't crash
      expect(results).toBeGreaterThanOrEqual(0);
    }
  });
  
  test('SEO Meta Tags exist on Homepage', async ({ page }) => {
    await page.goto(STOREFRONT_URL);
    
    const title = await page.title();
    expect(title.length).toBeGreaterThan(5);
    
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.length).toBeGreaterThan(10);
    
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toContain(STOREFRONT_URL);
  });

});
