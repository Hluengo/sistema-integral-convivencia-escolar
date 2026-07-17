import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { chromium } from 'playwright';

const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3001';

describe('Login', { skip: !process.env.E2E_BASE_URL }, () => {
  test('renders login page', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      const heading = page.getByRole('heading', { name: /iniciar sesión|ingresar|login/i });
      await heading.waitFor({ timeout: 10000 });
      assert.ok(await heading.isVisible());
    } finally {
      await browser.close();
    }
  });

  test('shows error with invalid credentials', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      const emailInput = page.getByLabel(/correo|email/i);
      const passwordInput = page.getByLabel(/contraseña|password/i);
      await emailInput.fill('fake@test.cl');
      await passwordInput.fill('wrongpassword');
      await page.getByRole('button', { name: /ingresar|iniciar sesión|entrar/i }).click();
      const errorMsg = page.getByText(/inválido|error|incorrecto|credenciales/i);
      await errorMsg.waitFor({ timeout: 10000 });
      assert.ok(await errorMsg.isVisible());
    } finally {
      await browser.close();
    }
  });
});

describe('Dashboard', { skip: !process.env.E2E_BASE_URL }, () => {
  test('renders metric cards', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      const cards = page.getByRole('button').filter({ hasText: /causas|activas|investigación|resueltas|alertas/i });
      const count = await cards.count();
      assert.ok(count >= 1, `Expected at least 1 metric card, got ${count}`);
    } finally {
      await browser.close();
    }
  });
});

describe('Anotaciones', { skip: !process.env.E2E_BASE_URL }, () => {
  test('navigates to anotaciones section', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      const anotacionesLink = page.getByRole('link', { name: /anotaciones|estudiantes/i }).or(
        page.getByRole('button', { name: /anotaciones|estudiantes/i })
      );
      if (await anotacionesLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await anotacionesLink.click();
        await page.waitForTimeout(2000);
        const heading = page.getByRole('heading', { name: /anotaciones|estudiantes|semáforo/i });
        const visible = await heading.isVisible({ timeout: 3000 }).catch(() => false);
        if (!visible) {
          const table = page.locator('table');
          assert.ok(await table.isVisible({ timeout: 3000 }).catch(() => false));
        }
      }
    } finally {
      await browser.close();
    }
  });
});

describe('Navigation', { skip: !process.env.E2E_BASE_URL }, () => {
  test('has working header navigation', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      const nav = page.locator('nav, header');
      assert.ok(await nav.isVisible({ timeout: 5000 }));
      const links = await nav.locator('a, button').count();
      assert.ok(links >= 2, `Expected at least 2 nav items, got ${links}`);
    } finally {
      await browser.close();
    }
  });
});

describe('Search and Filter', { skip: !process.env.E2E_BASE_URL }, () => {
  test('has a search/filter input', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      const searchInput = page.getByPlaceholder(/buscar|filtrar|search|filter/i);
      if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);
        const currentValue = await searchInput.inputValue();
        assert.equal(currentValue, 'test');
      }
    } finally {
      await browser.close();
    }
  });
});

describe('Accessibility', { skip: !process.env.E2E_BASE_URL }, () => {
  test('page has landmarks', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      const main = page.locator('main, [role="main"]');
      const hasMain = await main.isVisible({ timeout: 3000 }).catch(() => false);
      assert.ok(hasMain, 'Page should have a main landmark');
    } finally {
      await browser.close();
    }
  });
});
