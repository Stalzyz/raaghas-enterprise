const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER CONSOLE ERROR:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('BROWSER PAGE ERROR:', error.message);
  });

  page.on('requestfailed', request => {
    console.log('BROWSER REQUEST FAILED:', request.url(), request.failure().errorText);
  });

  await page.goto('https://raaghas.in', { waitUntil: 'networkidle2' });

  // Look for any products
  const products = await page.$$eval('a', links => links.map(a => a.href).filter(h => h.includes('/products/')));
  console.log(`Found ${products.length} product links on the homepage.`);

  await browser.close();
})();
