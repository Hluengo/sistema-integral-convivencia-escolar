(async () => {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://sistema-integral-convivencia-escolar-gneedpogv.vercel.app', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  console.log('=== TITLE ===');
  console.log(await page.title());
  console.log('=== URL ===');
  console.log(page.url());
  console.log('=== HEADINGS ===');
  const headings = await page.locator('h1, h2, h3, h4').all();
  for (const h of headings) {
    console.log(await h.evaluate(el => ({ tag: el.tagName, text: el.textContent?.trim() })));
  }
  console.log('=== BUTTONS ===');
  const btns = await page.locator('button').all();
  for (const b of btns) {
    console.log(await b.evaluate(el => ({ text: el.textContent?.trim(), aria: el.getAttribute('aria-label') })));
  }
  console.log('=== INPUTS ===');
  const inputs = await page.locator('input').all();
  for (const i of inputs) {
    console.log(await i.evaluate(el => ({ type: el.getAttribute('type'), placeholder: el.getAttribute('placeholder'), name: el.getAttribute('name'), label: el.getAttribute('aria-label') })));
  }
  console.log('=== MAIN CONTENT ===');
  const text = await page.locator('body').innerText();
  console.log(text.substring(0, 1000));
  await browser.close();
})();
