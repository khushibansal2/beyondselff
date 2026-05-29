const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log("Navigating to dashboard...");
  await page.goto('http://localhost:5174/dashboard', { waitUntil: 'networkidle2' });
  console.log("Done");
  
  await browser.close();
})();
