const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('response', response => {
    if (response.status() === 404) {
      console.log('404 URL:', response.url());
    }
  });

  await page.goto('https://raaghas.in/collections/all', { waitUntil: 'networkidle2' });
  
  const h3s = await page.evaluate(() => Array.from(document.querySelectorAll('h3')).map(h => h.innerText));
  console.log('H3 TEXTS:', h3s);

  await browser.close();
})();
