const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log('FAILED REQUEST:', response.status(), response.url());
    }
  });

  console.log('Navigating to https://admin.raaghas.in/login ...');
  await page.goto('https://admin.raaghas.in/login', { waitUntil: 'networkidle' });
  
  await page.screenshot({ path: 'admin_screenshot.png' });
  console.log('Screenshot saved to admin_screenshot.png');
  
  await browser.close();
})();
