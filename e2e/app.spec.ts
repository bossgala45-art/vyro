import { expect, test } from '@playwright/test';

test.describe('VYRO — fondations', () => {
  test('affiche l’accueil avec l’identité VYRO', async ({ page }) => {
    await page.goto('./');
    await expect(page).toHaveTitle('VYRO');
    await expect(page.getByRole('heading', { level: 1, name: 'VYRO' })).toBeVisible();
    await expect(page.getByText('BUILD YOUR BEST.')).toBeVisible();
  });

  test('navigue entre tous les onglets de la barre inférieure', async ({ page }) => {
    await page.goto('./');
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });

    for (const [label, hash] of [
      ['Séances', '#/entrainement'],
      ['Calendrier', '#/calendrier'],
      ['Progrès', '#/progres'],
      ['Plus', '#/plus'],
    ] as const) {
      await nav.getByRole('link', { name: label }).tap();
      await expect(page).toHaveURL(new RegExp(`${hash}$`));
      await expect(page.getByRole('heading', { level: 1, name: label })).toBeVisible();
    }

    await page.getByRole('navigation', { name: 'Autres modules' }).getByRole('link', { name: /Réglages/ }).tap();
    await expect(page.getByRole('heading', { level: 1, name: 'Réglages' })).toBeVisible();
  });

  test('rouvre directement un écran précis (lien profond)', async ({ page }) => {
    await page.goto('./#/calendrier');
    await expect(page.getByRole('heading', { level: 1, name: 'Calendrier' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Calendrier' })).toBeVisible();
  });

  test('ne déborde pas horizontalement sur un écran d’iPhone', async ({ page }) => {
    for (const hash of ['', '#/plus', '#/entrainement']) {
      await page.goto(`./${hash}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, hash || 'accueil').toBeLessThanOrEqual(0);
    }
  });

  test('ne contacte aucun serveur tiers', async ({ page, baseURL }) => {
    const origin = new URL(baseURL ?? '').origin;
    const external: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.protocol.startsWith('http') && url.origin !== origin) external.push(request.url());
    });
    await page.goto('./');
    await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Plus' }).tap();
    await page.waitForLoadState('networkidle');
    expect(external).toEqual([]);
  });
});

test.describe('PWA', () => {
  test('sert un manifeste valide avec des icônes accessibles', async ({ page, request }) => {
    await page.goto('./');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();

    const manifestUrl = new URL(href ?? '', page.url());
    const response = await request.get(manifestUrl.href);
    expect(response.ok()).toBe(true);
    const manifest = (await response.json()) as {
      name: string;
      display: string;
      start_url: string;
      icons: { src: string; sizes: string; purpose?: string }[];
    };

    expect(manifest.name).toBe('VYRO');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);

    for (const icon of manifest.icons) {
      const iconResponse = await request.get(new URL(icon.src, manifestUrl).href);
      expect(iconResponse.ok(), icon.src).toBe(true);
      expect(iconResponse.headers()['content-type']).toContain('image/png');
    }

    const touchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    expect((await request.get(new URL(touchIcon ?? '', page.url()).href)).ok()).toBe(true);
  });

  test('fonctionne hors ligne une fois le service worker installé', async ({ page, context }) => {
    await page.goto('./');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    // Le service worker contrôle la page à partir du chargement suivant.
    await page.reload();
    expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'VYRO' })).toBeVisible();

    await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Calendrier' }).tap();
    await expect(page.getByRole('heading', { level: 1, name: 'Calendrier' })).toBeVisible();

    await page.goto('./#/nutrition');
    await expect(page.getByRole('heading', { level: 1, name: 'Nutrition' })).toBeVisible();
    await context.setOffline(false);
  });
});
