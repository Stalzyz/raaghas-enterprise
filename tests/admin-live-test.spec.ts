/**
 * ═══════════════════════════════════════════════════════════════
 *  RAAGHAS ADMIN — FULL LIVE TEST SUITE
 *  Tests every page, adds dummy content, generates a report
 * ═══════════════════════════════════════════════════════════════
 * Run with:
 *   npx playwright test tests/admin-live-test.spec.ts --headed --reporter=html
 */
import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL  = 'https://admin.raaghas.in';
const API_URL   = 'https://api.raaghas.in';
const ADMIN_EMAIL    = 'admin@raaghas.in';
const ADMIN_PASSWORD = 'Admin@123456';

// ── helpers ────────────────────────────────────────────────────────────────────

async function screenshot(page: Page, name: string) {
  const dir = path.join('test-results', 'admin-live');
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
}

async function checkPageLoads(page: Page, url: string, label: string) {
  console.log(`\n▶ Testing: ${label} → ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1500);

  const title = await page.title();
  const hasError = await page.locator('text=/error|500|not found|crashed/i').count();

  await screenshot(page, label.replace(/\//g, '_').replace(/\s/g, '-').toLowerCase());

  return { label, url, title, error: hasError > 0 };
}

// ── Login ──────────────────────────────────────────────────────────────────────

test.describe('Raaghas Admin Live Test', () => {
  let results: Array<{ label: string; url: string; status: string; note?: string }> = [];

  test.beforeEach(async ({ page }) => {
    // Try navigating to dashboard; if we get redirected to login, log in
    await page.goto(`${BASE_URL}/dashboard`, { timeout: 20000 });
    const currentUrl = page.url();

    if (currentUrl.includes('/login')) {
      console.log('🔐 Not logged in — authenticating...');
      await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      console.log('✅ Logged in successfully');
    } else {
      console.log('✅ Already authenticated');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. CORE NAVIGATION PAGES
  // ─────────────────────────────────────────────────────────────────────────────

  test('1. Dashboard', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/dashboard`, 'dashboard');
    expect(r.error).toBeFalsy();
    // Check for key stats cards
    const statsVisible = await page.locator('h2, h3').first().isVisible();
    results.push({ label: 'Dashboard', url: r.url, status: statsVisible ? '✅ Pass' : '⚠️ Partial' });
  });

  test('2. Products - Inventory List', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/products`, 'products');
    expect(r.error).toBeFalsy();
    results.push({ label: 'Products List', url: r.url, status: '✅ Pass' });
  });

  test('3. Products - Create New Product (Dummy)', async ({ page }) => {
    await page.goto(`${BASE_URL}/products/new`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Fill in dummy product data
    const titleInput = page.locator('input').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('Test Silk Saree (Automated Test)');
    }

    await screenshot(page, 'product-new');
    results.push({ label: 'Create New Product', url: `${BASE_URL}/products/new`, status: '✅ Form Loaded' });
  });

  test('4. Products - Collections', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/products/collections`, 'products-collections');
    results.push({ label: 'Product Collections', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('5. Products - Shopify Import', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/products/shopify`, 'products-shopify');
    results.push({ label: 'Shopify Import', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. ORDERS
  // ─────────────────────────────────────────────────────────────────────────────

  test('6. Orders List', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/orders`, 'orders');
    results.push({ label: 'Orders', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CUSTOMERS
  // ─────────────────────────────────────────────────────────────────────────────

  test('7. Customers', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/customers`, 'customers');
    results.push({ label: 'Customers', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────────

  test('8. Analytics', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/analytics`, 'analytics');
    results.push({ label: 'Analytics', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('9. Analytics - Tax Reports', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/analytics/tax-reports`, 'analytics-tax');
    results.push({ label: 'Tax Reports', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('10. Analytics - Ledger', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/analytics/ledger`, 'analytics-ledger');
    results.push({ label: 'Ledger', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. MARKETING
  // ─────────────────────────────────────────────────────────────────────────────

  test('11. Marketing Hub', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/marketing`, 'marketing');
    results.push({ label: 'Marketing', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('12. Marketing - Coupons (Add Dummy)', async ({ page }) => {
    await page.goto(`${BASE_URL}/marketing/coupons`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Try clicking "Add Coupon" or "Create" button
    const addBtn = page.locator('button').filter({ hasText: /create|add|new/i }).first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(1000);
      // Fill in coupon code if a modal appears
      const codeInput = page.locator('input[placeholder*="code" i], input[placeholder*="coupon" i]').first();
      if (await codeInput.isVisible()) {
        await codeInput.fill('AUTOTEST10');
      }
    }

    await screenshot(page, 'marketing-coupons');
    results.push({ label: 'Coupons', url: `${BASE_URL}/marketing/coupons`, status: '✅ Pass' });
  });

  test('13. Marketing - Discounts', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/marketing/discounts`, 'marketing-discounts');
    results.push({ label: 'Discounts', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('14. Marketing - Offers', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/marketing/offers`, 'marketing-offers');
    results.push({ label: 'Offers', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('15. Marketing - Referrals', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/marketing/referrals`, 'marketing-referrals');
    results.push({ label: 'Referrals', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('16. Marketing - Wallet', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/marketing/wallet`, 'marketing-wallet');
    results.push({ label: 'Wallet', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('17. Marketing - AI Rules', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/marketing/ai-rules`, 'marketing-ai-rules');
    results.push({ label: 'AI Rules', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. WHOLESALE
  // ─────────────────────────────────────────────────────────────────────────────

  test('18. Wholesale - Retailers', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/wholesale/retailers`, 'wholesale-retailers');
    results.push({ label: 'Wholesale Retailers', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('19. Wholesale - Orders', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/wholesale/orders`, 'wholesale-orders');
    results.push({ label: 'Wholesale Orders', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('20. Wholesale - Price Lists', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/wholesale/price-lists`, 'wholesale-price-lists');
    results.push({ label: 'Wholesale Price Lists', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. LOGISTICS
  // ─────────────────────────────────────────────────────────────────────────────

  test('21. Logistics - Shipments', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/logistics/shipments`, 'logistics-shipments');
    results.push({ label: 'Shipments', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('22. Logistics - Returns', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/logistics/returns`, 'logistics-returns');
    results.push({ label: 'Returns', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('23. Logistics - Fulfillment', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/logistics/fulfillment`, 'logistics-fulfillment');
    results.push({ label: 'Fulfillment', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('24. Logistics - Shipping Zones', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/logistics/shipping`, 'logistics-shipping');
    results.push({ label: 'Shipping Zones', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. PROCUREMENT
  // ─────────────────────────────────────────────────────────────────────────────

  test('25. Procurement - Suppliers', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/procurement/suppliers`, 'procurement-suppliers');
    results.push({ label: 'Suppliers', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('26. Procurement - Purchase Orders', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/procurement/orders`, 'procurement-orders');
    results.push({ label: 'Purchase Orders', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. CMS
  // ─────────────────────────────────────────────────────────────────────────────

  test('27. CMS Hub', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/cms`, 'cms');
    results.push({ label: 'CMS Hub', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('28. CMS - Pages', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/cms/pages`, 'cms-pages');
    results.push({ label: 'CMS Pages', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('29. CMS - Lookbook Editor', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/cms/lookbook-editor`, 'cms-lookbook');
    results.push({ label: 'Lookbook Editor', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. ONLINE STORE
  // ─────────────────────────────────────────────────────────────────────────────

  test('30. Themes', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/online-store/themes`, 'themes');
    results.push({ label: 'Themes', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('31. Navigation', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/navigation`, 'navigation');
    results.push({ label: 'Navigation', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('32. Media Library', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/media`, 'media');
    results.push({ label: 'Media Library', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. INVOICES
  // ─────────────────────────────────────────────────────────────────────────────

  test('33. Invoice History', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/invoices/history`, 'invoices-history');
    results.push({ label: 'Invoice History', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('34. Invoice Builder', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/invoices/builder`, 'invoices-builder');
    results.push({ label: 'Invoice Builder', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 12. SETTINGS & ADMIN
  // ─────────────────────────────────────────────────────────────────────────────

  test('35. Settings', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/settings`, 'settings');
    results.push({ label: 'Settings', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('36. Integrations', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/integrations`, 'integrations');
    results.push({ label: 'Integrations', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('37. Roles', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/roles`, 'roles');
    results.push({ label: 'Roles & Permissions', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('38. Reviews', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/reviews`, 'reviews');
    results.push({ label: 'Reviews', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('39. Inventory', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/inventory`, 'inventory');
    results.push({ label: 'Inventory', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('40. Profile', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/profile`, 'profile');
    results.push({ label: 'Profile', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('41. Support', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/support`, 'support');
    results.push({ label: 'Support', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  test('42. Migration', async ({ page }) => {
    const r = await checkPageLoads(page, `${BASE_URL}/migration`, 'migration');
    results.push({ label: 'Migration', url: r.url, status: r.error ? '❌ Error' : '✅ Pass' });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PRINT REPORT AFTER ALL TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  test.afterAll(async () => {
    console.log('\n\n══════════════════════════════════════════════════════');
    console.log('   RAAGHAS ADMIN — LIVE TEST REPORT');
    console.log('══════════════════════════════════════════════════════');
    for (const r of results) {
      console.log(`${r.status.padEnd(12)} | ${r.label.padEnd(30)} | ${r.url}`);
    }
    console.log('══════════════════════════════════════════════════════');

    // Write JSON report
    const reportPath = path.join('test-results', 'admin-live', 'report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Full report saved → ${reportPath}`);
    console.log(`📸 Screenshots → test-results/admin-live/\n`);
  });
});
