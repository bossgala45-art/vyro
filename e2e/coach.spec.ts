import { expect, test } from '@playwright/test';
import { completeOnboarding } from './helpers';

test('coach : accueil, questions guidées, question non prise en charge, journal de motivation', async ({ page }) => {
  await completeOnboarding(page);

  // L'accueil mène au coach.
  await page.getByRole('link', { name: /Parler au coach/ }).tap();
  await expect(page.getByText('Salut Alex !')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Objectifs de la semaine' })).toBeVisible();

  // Question guidée.
  await page.getByRole('button', { name: 'Quels exercices ai-je réalisés récemment ?' }).tap();
  await expect(page.getByText('Aucune séance terminée ces 14 derniers jours.')).toBeVisible();

  // Question libre non prise en charge.
  await page.getByLabel('Ta question').fill('Quel est le meilleur joueur NBA ?');
  await page.getByRole('button', { name: 'Envoyer la question' }).tap();
  await expect(page.getByText('Je ne sais pas répondre à cette question')).toBeVisible();

  // Journal de motivation, conservé après rechargement.
  await page.goto('./#/coach/motivation');
  await page.getByLabel('Ta note').fill('Dunker avant juin');
  await page.getByRole('button', { name: 'Ajouter au journal' }).tap();
  await expect(page.getByText('Dunker avant juin')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Dunker avant juin')).toBeVisible();
});
