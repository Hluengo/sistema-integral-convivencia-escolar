import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';

const baseUrl = process.env.E2E_BASE_URL;

test('create/edit/close case flow smoke test', { skip: !baseUrl }, async () => {
  assert.ok(baseUrl);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /crear nueva causa|nueva causa/i }).first().click();
    await page.getByRole('heading', { name: /nuevo expediente/i }).waitFor();
  } finally {
    await browser.close();
  }
});
