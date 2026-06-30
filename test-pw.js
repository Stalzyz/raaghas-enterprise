const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('response', response => {
    if (response.status() === 404) {
      console.log('404 URL:', response.url());
    }
  });
  await page.goto('https://www.raaghas.in/collections/all', { waitUntil: 'networkidle' });
  await browser.close();
})();
