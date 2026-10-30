import { expect, test } from '@playwright/test';
import { completeOnboarding } from './helpers';

function isoInDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

test('calendrier : disponibilités, match ponctuel, vue mois, suivi, vacances et export ICS', async ({ page }) => {
  await completeOnboarding(page);

  // Disponibilités et programme.
  await page.goto('./#/calendrier/habituel');
  for (const day of ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']) {
    await page.getByRole('checkbox', { name: day }).check();
  }
  await page.getByRole('button', { name: 'Enregistrer les disponibilités' }).tap();
  await expect(page.getByText(/Disponibilités enregistrées/)).toBeVisible();
  await page.goto('./#/entrainement');
  await page.getByRole('button', { name: 'Générer mon programme' }).tap();
  await expect(page.getByText('Prochaine séance')).toBeVisible();

  // Match ponctuel demain à 15:00.
  const tomorrow = isoInDays(1);
  await page.goto(`./#/calendrier/activite/nouvelle?date=${tomorrow}`);
  await page.getByText('Match', { exact: true }).tap();
  await page.getByLabel('Heure (facultatif)').fill('15:00');
  await page.getByLabel('Durée (min)').fill('120');
  await page.getByRole('button', { name: 'Enregistrer' }).tap();
  await expect(page).not.toHaveURL(/activite/);

  await page.goto(`./#/calendrier/jour/${tomorrow}`);
  await expect(page.getByText('Match · 15:00–17:00')).toBeVisible();
  await expect(page.getByText(/Pas de séance prévue : jour de match/)).toBeVisible();

  // Vue mois.
  await page.goto('./#/calendrier?vue=mois');
  await expect(page.getByText('Musculation', { exact: true })).toBeVisible();

  // Suivi d'un match passé aujourd'hui.
  const today = isoInDays(0);
  await page.goto(`./#/calendrier/activite/nouvelle?date=${today}`);
  await page.getByText('Match', { exact: true }).tap();
  await page.getByLabel('Nom').fill('Match amical');
  await page.getByRole('button', { name: 'Enregistrer' }).tap();
  await expect(page).not.toHaveURL(/activite/);
  await page.goto(`./#/calendrier/jour/${today}`);
  await page.getByRole('link', { name: 'Saisir le match' }).tap();
  await page.getByRole('button', { name: '9', exact: true }).tap();
  await page.getByLabel('Points').fill('14');
  await page.getByRole('button', { name: 'Enregistrer' }).tap();
  await expect(page).not.toHaveURL(/suivi/);
  await page.goto('./#/calendrier/basket');
  await expect(page.getByText('intensité 9/10 · 14 pts')).toBeVisible();

  // Vacances avec confirmation.
  await page.goto('./#/calendrier/vacances');
  await page.getByLabel('Du').fill(isoInDays(10));
  await page.getByLabel('Au (inclus)').fill(isoInDays(14));
  await page.getByRole('button', { name: 'Activer le mode vacances…' }).tap();
  await expect(page.getByRole('alertdialog', { name: 'Confirmer les vacances ?' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmer' }).tap();
  await expect(page.getByText('Périodes prévues')).toBeVisible();

  // Export : les événements sont listés et le fichier est produit.
  await page.goto('./#/calendrier/export');
  await expect(page.getByText(/événements? à exporter/)).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter vers le Calendrier' }).tap();
  const file = await download;
  expect(file.suggestedFilename()).toBe('vyro-planning.ics');
  const path = await file.path();
  const { readFile } = await import('node:fs/promises');
  const ics = await readFile(path, 'utf8');
  expect(ics).toContain('BEGIN:VCALENDAR');
  // 15:00 à Paris converti en UTC (13:00 en heure d'été, 14:00 en heure d'hiver).
  expect(ics).toMatch(/DTSTART:\d{8}T1[34]0000Z/);
});
