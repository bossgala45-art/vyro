import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding } from './helpers';

const PASS = 'quatre mots pour basket';

async function addMotivation(page: Page, text: string) {
  await page.goto('./#/coach/motivation');
  await page.getByLabel('Ta note').fill(text);
  await page.getByRole('button', { name: 'Ajouter au journal' }).tap();
  await expect(page.getByRole('list', { name: 'Journal de motivation' }).getByText(text)).toBeVisible();
}

async function addPhoto(page: Page) {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1200;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas');
    context.fillStyle = '#2b7e4c';
    context.fillRect(0, 0, 900, 1200);
    return canvas.toDataURL('image/png');
  });
  await page.goto('./#/progres/photos/nouvelle');
  await page.getByLabel('Choisir une photo de progression').setInputFiles({
    name: 'moi.png',
    mimeType: 'image/png',
    buffer: Buffer.from(dataUrl.split(',')[1] ?? '', 'base64'),
  });
  await expect(page.getByText(/Réduite à/)).toBeVisible();
  await page.getByRole('button', { name: 'Enregistrer la photo' }).tap();
  await expect(page.getByRole('heading', { name: 'Chronologie' })).toBeVisible();
}

test('sauvegarde chiffrée : export, effacement complet, restauration avec photo', { tag: '@webkit' }, async ({ page }) => {
  await completeOnboarding(page);
  await addMotivation(page, 'Garder la forme toute la saison');
  await addPhoto(page);

  // Export : le fichier est téléchargé (pas de feuille de partage dans le navigateur de test).
  await page.goto('./#/reglages/sauvegarde');
  await page.getByLabel('Phrase secrète', { exact: true }).fill(PASS);
  await page.getByLabel('Confirme la phrase secrète').fill(PASS);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Créer la sauvegarde' }).tap();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^vyro-sauvegarde-.*\.vyro$/);
  const path = await download.path();
  const bytes = await readFile(path);
  expect(bytes.subarray(0, 8).toString()).toBe('VYROBAK1');
  // Le contenu n'est pas lisible en clair.
  expect(bytes.toString('latin1')).not.toContain('Garder la forme');
  await expect(page.getByText(/Sauvegarde créée/)).toBeVisible();

  // Effacement complet de l'appareil.
  await page.goto('./#/reglages');
  await page.getByRole('button', { name: 'Effacer toutes mes données' }).tap();
  await page.getByRole('alertdialog').getByRole('textbox').fill('EFFACER');
  await page.getByRole('button', { name: 'Tout effacer' }).tap();
  await expect(page).toHaveURL(/#\/bienvenue$/);

  // Nouveau profil minimal, puis restauration.
  await completeOnboarding(page, { firstName: 'Nouveau' });
  await page.goto('./#/reglages/sauvegarde');
  await page.getByLabel('Choisir un fichier de sauvegarde').setInputFiles(path);
  await page.getByLabel('Phrase secrète de cette sauvegarde').fill('mauvaise phrase secrète');
  await page.getByRole('button', { name: 'Déchiffrer et vérifier' }).tap();
  await expect(page.getByText(/Phrase secrète incorrecte/)).toBeVisible();

  await page.getByLabel('Phrase secrète de cette sauvegarde').fill(PASS);
  await page.getByRole('button', { name: 'Déchiffrer et vérifier' }).tap();
  await expect(page.getByText('Sauvegarde vérifiée ✓')).toBeVisible();
  await expect(page.getByText(/profil de Alex/)).toBeVisible();
  await page.getByRole('button', { name: 'Remplacer par la sauvegarde' }).tap();
  await page.getByRole('alertdialog').getByRole('textbox').fill('RESTAURER');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Restaurer' }).tap();
  await expect(page.getByText('Sauvegarde restaurée')).toBeVisible();

  // Données et photo restaurées, conservées après rechargement.
  await page.reload();
  await page.goto('./#/coach/motivation');
  await expect(page.getByText('Garder la forme toute la saison')).toBeVisible();
  await page.goto('./#/progres/photos');
  await expect(page.getByRole('link', { name: /Ouvrir la photo : Face/ })).toHaveCount(1);
  await page.goto('./');
  await expect(page.getByText('Salut Alex')).toBeVisible();
});

test('sécurité : aucune requête vers un autre site n’est possible (CSP)', async ({ page }) => {
  await page.goto('./');
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("connect-src 'self'");
  const violated = await page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        document.addEventListener('securitypolicyviolation', (event) => resolve(event.violatedDirective), { once: true });
        void fetch('https://example.com/collecte').catch(() => undefined);
      }),
  );
  expect(violated).toContain('connect-src');
});
