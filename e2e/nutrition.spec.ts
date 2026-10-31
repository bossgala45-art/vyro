import { expect, test } from '@playwright/test';
import { completeOnboarding } from './helpers';

test('nutrition : hydratation, repas avec photo réduite, conservés après rechargement', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('./#/nutrition');

  // Hydratation : ajout rapide.
  await page.getByRole('button', { name: '+ 1 verre (250 ml)' }).tap();
  await expect(page.getByText('250 ml', { exact: true })).toBeVisible();

  // Une vraie photo de 2400 × 1800 px, créée dans le navigateur.
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2400;
    canvas.height = 1800;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas');
    context.fillStyle = '#c0632b';
    context.fillRect(0, 0, 2400, 1800);
    context.fillStyle = '#f4e1a1';
    context.fillRect(600, 450, 1200, 900);
    return canvas.toDataURL('image/png');
  });
  const png = Buffer.from(dataUrl.split(',')[1] ?? '', 'base64');

  await page.getByRole('link', { name: 'Ajouter : Déjeuner' }).tap();
  await page.getByLabel('Qu’as-tu mangé ?').fill('Pâtes au thon');
  await page.getByText('Normale', { exact: true }).tap();
  await page.getByLabel('Choisir une photo du repas').setInputFiles({ name: 'repas.png', mimeType: 'image/png', buffer: png });
  const preview = page.getByRole('img', { name: 'Photo du repas' });
  await expect(preview).toBeVisible();
  // Réduite à 1280 px de large et réencodée en JPEG avant stockage.
  await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1280);
  await expect(page.getByText(/Analyse automatique désactivée/)).toBeVisible();
  await page.getByRole('button', { name: 'Enregistrer' }).tap();
  await expect(page.getByRole('link', { name: /Pâtes au thon/ })).toBeVisible();

  // Après rechargement : repas, photo et boisson sont toujours là.
  await page.reload();
  await expect(page.getByRole('link', { name: /Pâtes au thon/ })).toBeVisible();
  await expect(page.getByLabel('Avec photo')).toBeVisible();
  await expect(page.getByText('250 ml', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: /Pâtes au thon/ }).tap();
  await expect(page.getByRole('img', { name: 'Photo du repas' })).toBeVisible();
  await expect.poll(() => page.getByRole('img', { name: 'Photo du repas' }).evaluate((img: HTMLImageElement) => img.naturalHeight)).toBe(960);

  // Idées de repas.
  await page.goto('./#/nutrition/idees');
  await expect(page.getByRole('heading', { name: 'Idées de repas' })).toBeVisible();
  await expect(page.getByText('Astuces')).toBeVisible();
});
