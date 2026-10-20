import { expect, type Page } from '@playwright/test';

function isoDateInYears(years: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().slice(0, 10);
}

/** Parcourt la configuration initiale complète via l'interface, comme un utilisateur. */
export async function completeOnboarding(page: Page, { firstName = 'Alex' } = {}) {
  await page.goto('./');
  await page.getByRole('button', { name: 'Commencer' }).tap();

  await page.getByLabel('Prénom (facultatif)').fill(firstName);
  await page.getByLabel('Année de naissance').fill(String(new Date().getFullYear() - 18));
  await page.getByText('Homme', { exact: true }).tap();
  await page.getByLabel('Taille').fill('172');
  await page.getByLabel('Poids actuel').fill('58');
  await page.getByRole('button', { name: 'Continuer' }).tap();

  await page.getByText('3 à 6 mois').tap();
  await page.getByText('Physique athlétique').tap();
  await page.getByLabel('Date d’objectif').fill(isoDateInYears(1));
  await page.getByRole('button', { name: 'Continuer' }).tap();

  await page.getByText('Haltères', { exact: true }).tap();
  await page.getByLabel('Séance min.').fill('60');
  await page.getByLabel('Séance max.').fill('90');
  await page.getByRole('button', { name: 'Continuer' }).tap();

  await page.getByLabel('Aliments que tu aimes', { exact: true }).fill('Pâtes');
  await page.getByLabel('Aliments que tu aimes', { exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Continuer' }).tap();

  await expect(page.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await page.getByRole('button', { name: 'Créer mon profil' }).tap();
  await expect(page.getByText(`Salut ${firstName}`)).toBeVisible();
}
