import { expect, test } from '@playwright/test';
import { completeOnboarding } from './helpers';

test('premier lancement : la configuration est obligatoire avant d’accéder à l’app', async ({ page }) => {
  await page.goto('./#/calendrier');
  await expect(page).toHaveURL(/#\/bienvenue$/);
  await page.getByRole('button', { name: 'Commencer' }).tap();
  await page.getByRole('button', { name: 'Continuer' }).tap();
  await expect(page.getByText('Indique ton année de naissance (ex. 2008).')).toBeVisible();
  await expect(page.getByText('Étape 1 sur 5')).toBeVisible();
});

test('le profil survit à la fermeture et à la réouverture de l’application', async ({ page, context }) => {
  await completeOnboarding(page);

  // Nouvelle page dans le même navigateur = app fermée puis rouverte (même stockage).
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto('./');
  await expect(reopened.getByText('Salut Alex')).toBeVisible();
  await reopened.goto('./#/profil');
  await expect(reopened.getByText('172 cm')).toBeVisible();
  await expect(reopened.getByText('Pâtes')).toBeVisible();
  await expect(reopened.getByText('58 kg').first()).toBeVisible();
});

test('une configuration interrompue reprend là où elle s’était arrêtée', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Commencer' }).tap();
  await page.getByLabel('Taille').fill('172');
  await page.waitForTimeout(700);

  // Rechargement sur place : la saisie est restaurée.
  await page.reload();
  await expect(page.getByLabel('Taille')).toHaveValue('172');

  // Réouverture depuis l'accueil : l'écran de bienvenue propose de reprendre.
  await page.goto('./');
  await page.getByRole('button', { name: 'Reprendre la configuration' }).tap();
  await expect(page.getByLabel('Taille')).toHaveValue('172');
});

test('modifier le profil et ajouter une pesée', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('./#/profil');

  await page.getByRole('link', { name: 'Modifier : Entraînement' }).tap();
  await page.getByText('Barre de traction').tap();
  await page.getByRole('button', { name: 'Enregistrer' }).tap();
  await expect(page).toHaveURL(/#\/profil$/);
  await expect(page.getByText('Haltères, Barre de traction')).toBeVisible();

  await page.getByRole('button', { name: 'Nouvelle pesée' }).tap();
  await page.getByLabel('Poids', { exact: true }).fill('58,7');
  await page.getByRole('button', { name: 'Enregistrer' }).tap();
  await expect(page.getByText('58,7 kg').first()).toBeVisible();

  await page.reload();
  await expect(page.getByText('58,7 kg').first()).toBeVisible();
});

test('verrouillage : code demandé à la réouverture, mauvais code refusé', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('./#/reglages');
  await page.getByRole('button', { name: 'Activer le verrouillage' }).tap();
  await page.getByLabel('Code', { exact: true }).fill('basket27');
  await page.getByLabel('Confirme le code').fill('basket27');
  await page.getByRole('button', { name: 'Activer' }).tap();
  await expect(page.getByText('Verrouillage activé.')).toBeVisible();

  const stored = await page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const request = indexedDB.open('vyro');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const read = request.result.transaction('settings').objectStore('settings').getAll();
          read.onsuccess = () => resolve(JSON.stringify(read.result));
        };
      }),
  );
  expect(stored).not.toContain('basket27');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'VYRO est verrouillé' })).toBeVisible();
  await expect(page.getByText('Salut Alex')).toHaveCount(0);

  await page.getByLabel('Code de verrouillage').fill('mauvais1');
  await page.getByRole('button', { name: 'Déverrouiller' }).tap();
  await expect(page.getByText('Code incorrect.')).toBeVisible();

  await page.getByLabel('Code de verrouillage').fill('basket27');
  await page.getByRole('button', { name: 'Déverrouiller' }).tap();
  await expect(page.getByRole('heading', { name: 'Réglages' })).toBeVisible();
});

test('effacer toutes les données ramène à l’écran de bienvenue, même après rechargement', async ({ page }) => {
  await completeOnboarding(page);
  await page.goto('./#/reglages');
  await page.getByRole('button', { name: 'Effacer toutes mes données' }).tap();
  await page.getByRole('alertdialog').getByRole('textbox').fill('EFFACER');
  await page.getByRole('button', { name: 'Tout effacer' }).tap();
  await expect(page).toHaveURL(/#\/bienvenue$/);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Commencer' })).toBeVisible();
});
