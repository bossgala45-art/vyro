import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding } from './helpers';

/** Vraie image PNG (portrait 2400 × 3200) générée dans le navigateur. */
async function makePng(page: Page, color: string): Promise<Buffer> {
  const dataUrl = await page.evaluate((fill) => {
    const canvas = document.createElement('canvas');
    canvas.width = 2400;
    canvas.height = 3200;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas');
    context.fillStyle = fill;
    context.fillRect(0, 0, 2400, 3200);
    context.fillStyle = '#ffffff';
    context.fillRect(900, 600, 600, 2000);
    return canvas.toDataURL('image/png');
  }, color);
  return Buffer.from(dataUrl.split(',')[1] ?? '', 'base64');
}

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function addPhoto(page: Page, buffer: Buffer, date: string) {
  await page.goto('./#/progres/photos/nouvelle');
  await page.getByLabel('Date de la photo').fill(date);
  await page.getByLabel('Choisir une photo de progression').setInputFiles({ name: 'moi.png', mimeType: 'image/png', buffer });
  await expect(page.getByText(/Réduite à 1200 × 1600 px/)).toBeVisible();
  await page.getByRole('button', { name: 'Enregistrer la photo' }).tap();
  await expect(page.getByRole('heading', { name: 'Chronologie' })).toBeVisible();
}

test('transformation : photos réduites, comparaison, zoom, suppression, mensurations et graphique', async ({ page }) => {
  await completeOnboarding(page);
  await addPhoto(page, await makePng(page, '#2b4c7e'), isoDaysAgo(35));
  await addPhoto(page, await makePng(page, '#7e2b4c'), isoDaysAgo(0));

  // Chronologie et persistance après rechargement.
  await page.reload();
  await expect(page.getByRole('link', { name: /Ouvrir la photo : Face/ })).toHaveCount(2);

  // Comparaison côte à côte, avec les images complètes.
  await page.goto('./#/progres/comparer');
  const before = page.getByRole('img', { name: /^Avant/ });
  const after = page.getByRole('img', { name: /^Après/ });
  await expect(before).toBeVisible();
  await expect(after).toBeVisible();
  await expect.poll(() => after.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1200);
  await expect(page.getByText('35 jours d’écart')).toBeVisible();
  await expect(page.getByText(/Analyse visuelle désactivée/)).toBeVisible();

  // Visionneuse : zoom puis suppression définitive.
  await page.goto('./#/progres/photos');
  await page.getByRole('link', { name: /Ouvrir la photo : Face/ }).first().tap();
  await page.getByRole('button', { name: 'Zoomer', exact: true }).tap();
  await expect(page.getByText('1,5×')).toBeVisible();
  await page.getByRole('button', { name: 'Supprimer cette photo' }).tap();
  await page.getByRole('button', { name: 'Supprimer', exact: true }).tap();
  await expect(page.getByRole('link', { name: /Ouvrir la photo : Face/ })).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('link', { name: /Ouvrir la photo : Face/ })).toHaveCount(1);

  // Mensurations et graphique.
  await page.goto('./#/progres/mensurations');
  await page.getByLabel('Tour de bras').fill('31,5');
  await page.getByRole('button', { name: 'Enregistrer' }).tap();
  await expect(page.getByText('Mensurations enregistrées.')).toBeVisible();
  await page.goto('./#/progres');
  await expect(page.getByRole('img', { name: /Poids : 1 mesure/ })).toBeVisible();
  await page.getByRole('group', { name: 'Mesure' }).getByText('Bras').tap();
  await expect(page.getByRole('img', { name: /Tour de bras : 1 mesure, 31,5 cm/ })).toBeVisible();
});
