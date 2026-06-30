/**
 * ═══════════════════════════════════════════════════════════════
 *  RAAGHAS ADMIN — FULL LIVE TEST (Node.js Script)
 *  Uses Playwright's launchPersistentContext to bypass macOS sandbox
 *
 *  Run: node tests/run-admin-test.js
 * ═══════════════════════════════════════════════════════════════
 */

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BASE_URL = 'https://admin.raaghas.in';
const EMAIL    = 'admin@raaghas.in';
const PASSWORD = 'RaaghasAdmin2024!';
const USER_DATA_DIR = path.join(os.tmpdir(), 'raaghas-playwright-profile');
const SCREENSHOT_DIR = path.join('test-results', 'admin-live');

const PAGES = [
  { label: 'Dashboard',               path: '/dashboard' },
  { label: 'Products List',           path: '/products' },
  { label: 'New Product',             path: '/products/new' },
  { label: 'Product Collections',     path: '/products/collections' },
  { label: 'Shopify Import',          path: '/products/shopify' },
  { label: 'Orders',                  path: '/orders' },
  { label: 'Customers',               path: '/customers' },
  { label: 'Analytics',               path: '/analytics' },
  { label: 'Tax Reports',             path: '/analytics/tax-reports' },
  { label: 'Ledger',                  path: '/analytics/ledger' },
  { label: 'Marketing Hub',           path: '/marketing' },
  { label: 'Coupons',                 path: '/marketing/coupons' },
  { label: 'Discounts',               path: '/marketing/discounts' },
  { label: 'Offers',                  path: '/marketing/offers' },
  { label: 'Referrals',               path: '/marketing/referrals' },
  { label: 'Wallet',                  path: '/marketing/wallet' },
  { label: 'AI Rules',                path: '/marketing/ai-rules' },
  { label: 'Wholesale Retailers',     path: '/wholesale/retailers' },
  { label: 'Wholesale Orders',        path: '/wholesale/orders' },
  { label: 'Wholesale Price Lists',   path: '/wholesale/price-lists' },
  { label: 'Logistics Shipments',     path: '/logistics/shipments' },
  { label: 'Logistics Returns',       path: '/logistics/returns' },
  { label: 'Logistics Fulfillment',   path: '/logistics/fulfillment' },
  { label: 'Shipping Zones',          path: '/logistics/shipping' },
  { label: 'Suppliers',               path: '/procurement/suppliers' },
  { label: 'Purchase Orders',         path: '/procurement/orders' },
  { label: 'CMS Hub',                 path: '/cms' },
  { label: 'CMS Pages',               path: '/cms/pages' },
  { label: 'Lookbook Editor',         path: '/cms/lookbook-editor' },
  { label: 'Themes',                  path: '/online-store/themes' },
  { label: 'Navigation',              path: '/navigation' },
  { label: 'Media Library',           path: '/media' },
  { label: 'Invoice History',         path: '/invoices/history' },
  { label: 'Invoice Builder',         path: '/invoices/builder' },
  { label: 'Settings',                path: '/settings' },
  { label: 'Integrations',            path: '/integrations' },
  { label: 'Roles',                   path: '/roles' },
  { label: 'Reviews',                 path: '/reviews' },
  { label: 'Inventory',               path: '/inventory' },
  { label: 'Profile',                 path: '/profile' },
  { label: 'Support',                 path: '/support' },
  { label: 'Migration',               path: '/migration' },
];

async function run() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });

  const results = [];
  console.log('\n💎 RAAGHAS ADMIN — FULL LIVE TEST SUITE\n');
  console.log(`📂 Screenshots: ${SCREENSHOT_DIR}`);
  console.log(`🌐 Target: ${BASE_URL}\n`);

  // ── Launch with persistent context (solves macOS sandbox issue) ─────────────
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
    ],
    viewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();

  // ── Login ───────────────────────────────────────────────────────────────────
  console.log('🔐 Checking authentication...');
  await page.goto(`${BASE_URL}/dashboard`, { timeout: 20000 });
  await page.waitForTimeout(2000);

  if (page.url().includes('/login') || page.url().includes('/sign-in')) {
    console.log('   → Not logged in, authenticating...');
    await page.fill('input[type="email"], input[name="email"]', EMAIL).catch(() => {});
    await page.fill('input[type="password"], input[name="password"]', PASSWORD).catch(() => {});
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    console.log(`   ✅ Login attempted → now at: ${page.url()}`);
  } else {
    console.log(`   ✅ Already logged in → ${page.url()}`);
  }

  // ── Test each page ──────────────────────────────────────────────────────────
  for (const item of PAGES) {
    const url = `${BASE_URL}${item.path}`;
    const slug = item.label.replace(/\s+/g, '-').toLowerCase();

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1500);

      const title = await page.title();
      const errorTexts = await page.locator('text=/error|500|something went wrong|not found/i').count();
      const hasContent = await page.locator('main, #main-content, [class*="container"]').count();

      const status = errorTexts > 0 ? '❌ ERROR' : hasContent > 0 ? '✅ OK' : '⚠️  EMPTY';

      // Screenshot every page
      const ssPath = path.join(SCREENSHOT_DIR, `${slug}.png`);
      await page.screenshot({ path: ssPath, fullPage: true });

      console.log(`${status.padEnd(12)} ${item.label.padEnd(28)} ${url}`);
      results.push({ label: item.label, url, status, title });

    } catch (err) {
      console.log(`❌ TIMEOUT   ${item.label.padEnd(28)} ${url}`);
      results.push({ label: item.label, url, status: '❌ TIMEOUT', error: err.message });
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n\n══════════════════════════════════════════════════════');
  console.log('                  TEST SUMMARY');
  console.log('══════════════════════════════════════════════════════');
  const passed  = results.filter(r => r.status.includes('OK')).length;
  const errored = results.filter(r => r.status.includes('ERROR') || r.status.includes('TIMEOUT')).length;
  const empty   = results.filter(r => r.status.includes('EMPTY')).length;
  console.log(`  ✅ Passed:  ${passed}`);
  console.log(`  ⚠️  Empty:   ${empty}`);
  console.log(`  ❌ Failed:  ${errored}`);
  console.log(`  📊 Total:   ${results.length}`);
  console.log('══════════════════════════════════════════════════════\n');

  // ── Pages that need attention ────────────────────────────────────────────────
  const issues = results.filter(r => !r.status.includes('OK'));
  if (issues.length > 0) {
    console.log('⚠️  PAGES NEEDING ATTENTION:');
    for (const r of issues) {
      console.log(`   ${r.status} → ${r.label} (${r.url})`);
    }
    console.log('');
  }

  // ── Write JSON report ────────────────────────────────────────────────────────
  const reportPath = path.join(SCREENSHOT_DIR, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Full report → ${reportPath}`);
  console.log(`📸 Screenshots → ${SCREENSHOT_DIR}/\n`);

  await browser.close();
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
