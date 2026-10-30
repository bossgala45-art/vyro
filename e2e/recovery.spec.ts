import { expect, test } from '@playwright/test';
import { completeOnboarding } from './helpers';

test('récupération : check-in, conseil expliqué, historique et effet sur le calendrier', async ({ page }) => {
  await completeOnboarding(page);

  // L'accueil invite au check-in.
  await page.getByRole('link', { name: 'Faire mon check-in' }).tap();
  await page.getByLabel('Sommeil cette nuit').fill('5,5');
  await page.getByRole('button', { name: 'Énergie : 4' }).tap();
  await page.getByRole('button', { name: 'Motivation : 6' }).tap();
  await page.getByText('Fortes', { exact: true }).tap();
  await page.getByText('Non', { exact: true }).tap();
  await page.getByRole('button', { name: 'Voir mon conseil du jour' }).tap();

  // 3 signaux de fatigue cumulés → activité légère, chacun expliqué.
  await expect(page.getByText('Activité légère', { exact: true })).toBeVisible();
  await expect(page.getByText('Nuit courte (5 h 30)')).toBeVisible();
  await expect(page.getByText('Énergie basse (4/10)')).toBeVisible();
  await expect(page.getByText('Fortes courbatures')).toBeVisible();
  await expect(page.getByText(/pas un avis médical/)).toBeVisible();

  // Le check-in survit à un rechargement et apparaît dans l'historique.
  await page.reload();
  await page.goto('./#/recuperation');
  await expect(page.getByText('Moyenne 7 j : 5,5 h (1 jour)')).toBeVisible();

  // Modification : bonne forme → séance normale.
  await page.getByRole('link', { name: 'Modifier mon check-in' }).tap();
  await expect(page.getByLabel('Sommeil cette nuit')).toHaveValue('5,5');
  await page.getByLabel('Sommeil cette nuit').fill('8');
  await page.getByRole('button', { name: 'Énergie : 8' }).tap();
  await page.getByText('Aucune', { exact: true }).tap();
  await page.getByRole('button', { name: 'Voir mon conseil du jour' }).tap();
  await expect(page.getByText('Séance normale')).toBeVisible();
});
