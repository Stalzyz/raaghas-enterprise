import { test, expect } from '@playwright/test';
import { adminLogin, waitForStableNetwork } from './helpers/auth';

const ADMIN_URL = 'https://admin.raaghas.in';
const STORE_URL = 'https://raaghas.in';

test.describe('💎 Production Hardcore Validation', () => {

  test('Storefront: Critical Flow (Home → Cart → Checkout)', async ({ page }) => {
    await page.goto(STORE_URL);
    await waitForStableNetwork(page);

    // Verify logo and main text
    await expect(page.locator('text=RAAGHAS')).toBeVisible();
    
    // Check if products exist (using generic card selector)
    const productCount = await page.locator('a[href*="/products/"]').count();
    expect(productCount).toBeGreaterThan(0);

    // Click first product
    await page.locator('a[href*="/products/"]').first().click();
    await expect(page).toHaveURL(/products/i);

    // Add to Cart (using typical button text)
    await page.click('text=Add to Cart');
    
    // Go to Cart
    await page.goto(`${STORE_URL}/cart`);
    await expect(page.locator('text=Shopping Bag')).toBeVisible();

    // Proceed to Checkout
    await page.click('text=Checkout');
    await expect(page).toHaveURL(/checkout/i);
    
    // Verify checkout page loaded (Check for 'Shipping Address' text)
    await expect(page.locator('text=Shipping Address')).toBeVisible();
  });

  test('Admin: Financial Infrastructure Validation', async ({ page }) => {
    // These credentials should be set in environment variables in a real CI environment
    // Using placeholders for now to demonstrate the flow
    const email = process.env.ADMIN_EMAIL || 'admin@raaghas.in';
    const password = process.env.ADMIN_PASSWORD || 'password';

    await adminLogin(page, `${ADMIN_URL}/login`, email, password);
    
    // 1. Verify Sidebar Fixes (The new links we added)
    await expect(page.locator('text=Credits & Wallets')).toBeVisible();
    await expect(page.locator('text=Financial Ledger')).toBeVisible();

    // 2. Test Wallets Page (Supports all roles)
    await page.click('text=Credits & Wallets');
    await expect(page).toHaveURL(/marketing\/wallet/);
    
    // Verify Role Filter exists (The new feature we added)
    await expect(page.locator('select')).toBeVisible();
    await expect(page.locator('text=Account Details')).toBeVisible();

    // 3. Test Ledger Page
    await page.click('text=Financial Ledger');
    await expect(page).toHaveURL(/analytics\/ledger/);
    await expect(page.locator('text=General Ledger')).toBeVisible();
  });

  test('API: Core Health Checks', async ({ request }) => {
    // Check public settings endpoint
    const settingsRes = await request.get('https://api.raaghas.in/api/v1/settings/public');
    expect(settingsRes.ok()).toBeTruthy();
    const settings = await settingsRes.json();
    expect(settings).toHaveProperty('storeName');

    // Check products endpoint
    const productsRes = await request.get('https://api.raaghas.in/api/v1/products');
    expect(productsRes.ok()).toBeTruthy();
  });

});
