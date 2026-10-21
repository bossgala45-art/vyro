import { expect, test } from '@playwright/test';
import { completeOnboarding } from './helpers';


test('musculation : planning, programme, séance complète et historique', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('./#/entrainement');

  await page.getByRole('button', { name: 'Indiquer mes disponibilités' }).tap();
  for (const day of ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']) {
    await page.getByRole('checkbox', { name: day }).check();
  }
  await page.getByRole('button', { name: 'Enregistrer les disponibilités' }).tap();
  await expect(page.getByText(/Disponibilités enregistrées/)).toBeVisible();
  await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Séances' }).tap();

  await page.getByRole('button', { name: 'Générer mon programme' }).tap();
  // Profil de test avec des haltères seulement : le manque de matériel est signalé, pas masqué.
  await expect(page.getByText(/aucun exercice disponible pour « tirage vertical »/).first()).toBeVisible();
  await expect(page.getByRole('list', { name: 'Planning de la semaine' })).toBeVisible();

  await page.getByRole('button', { name: 'Commencer' }).tap();
  const dialog = page.getByRole('dialog');
  await dialog.getByText('Bien', { exact: true }).tap();
  await dialog.getByRole('button', { name: 'Commencer', exact: true }).tap();

  await expect(page.getByRole('heading', { level: 1, name: 'Séance A — corps complet' })).toBeVisible();
  await page.getByLabel('Répétitions — Squat gobelet, série 1').fill('10');
  await page.getByLabel('Charge en kg — Squat gobelet, série 1').fill('16');
  await page.getByLabel('Répétitions en réserve — Squat gobelet, série 1').selectOption('3');
  await page.getByRole('button', { name: 'Valider Squat gobelet, série 1' }).tap();
  await expect(page.getByRole('timer')).toBeVisible();
  // La charge est reprise pour la série suivante.
  await expect(page.getByLabel('Charge en kg — Squat gobelet, série 2')).toHaveValue('16');

  // Fermeture et réouverture de l'app en pleine séance.
  await page.reload();
  await expect(page.getByText('10 rép. × 16 kg · 3 en réserve')).toBeVisible();

  await page.getByRole('button', { name: 'Terminer la séance' }).tap();
  await page.getByRole('dialog').getByRole('button', { name: '6', exact: true }).tap();
  await page.getByRole('button', { name: 'Enregistrer la séance' }).tap();
  await expect(page.getByText('Séance terminée')).toBeVisible();

  await page.goto('./#/entrainement');
  await expect(page.getByText('Séance B — corps complet')).toBeVisible();
  await page.getByRole('link', { name: 'Historique' }).tap();
  await expect(page.getByText(/Séance A ·/)).toBeVisible();
  await page.goto('./#/entrainement/records');
  await expect(page.getByRole('heading', { name: 'Squat gobelet' })).toBeVisible();
});
