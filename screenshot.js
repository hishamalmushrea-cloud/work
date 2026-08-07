const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set to mobile viewport
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  const fileUrl = 'file:///' + path.resolve(__dirname, 'android/app/src/main/assets/index.html').replace(/\\/g, '/');
  
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  // Helper function to click and wait
  const navAndSnap = async (route, filename) => {
    await page.evaluate((r) => {
      const btn = document.querySelector(`[data-go="${r}"]`);
      if(btn) btn.click();
    }, route);
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(__dirname, 'website/img', filename), type: 'jpeg', quality: 90 });
  };

  // 1. Home
  await page.screenshot({ path: path.join(__dirname, 'website/img/app_home.jpg'), type: 'jpeg', quality: 90 });
  
  // 2. Plan
  await navAndSnap('plan', 'app_plan.jpg');
  
  // 3. Dashboard
  await navAndSnap('dashboard', 'app_dashboard.jpg');
  
  // 4. Mistakes
  await navAndSnap('mistakes', 'app_mistakes.jpg');
  
  // 5. Notebook
  await navAndSnap('notebook', 'app_notebook.jpg');

  await browser.close();
  console.log('5 Screenshots captured successfully.');
})();
