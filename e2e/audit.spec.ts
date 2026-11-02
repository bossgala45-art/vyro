import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding } from './helpers';

/**
 * Audit de tous les écrans avec des données réelles saisies par l'interface :
 * - accessibilité (axe-core, règles WCAG 2.1 A et AA, contraste compris) ;
 * - aucune erreur JavaScript ni erreur de console ;
 * - un titre de niveau 1 par écran ;
 * - aucun débordement horizontal sur un écran d'iPhone.
 */

/** Première clé d'une table IndexedDB de VYRO (pour ouvrir les écrans de détail). */
function firstKey(page: Page, table: string): Promise<string> {
  return page.evaluate(
    (name) =>
      new Promise<string>((resolve, reject) => {
        const request = indexedDB.open('vyro');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const keys = request.result.transaction(name).objectStore(name).getAllKeys();
          keys.onsuccess = () => {
            resolve(String(keys.result[0] ?? ''));
            request.result.close();
          };
        };
      }),
    table,
  );
}

async function seed(page: Page): Promise<{ workoutId: string; mealId: string; photoId: string; activityId: string }> {
  await completeOnboarding(page);

  // Disponibilités, programme, check-in et une séance terminée.
  await page.goto('./#/entrainement');
  await page.getByRole('button', { name: 'Indiquer mes disponibilités' }).tap();
  for (const day of ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']) await page.getByRole('checkbox', { name: day }).check();
  await page.getByRole('button', { name: 'Enregistrer les disponibilités' }).tap();
  await expect(page.getByText(/Disponibilités enregistrées/)).toBeVisible();
  await page.goto('./#/entrainement');
  await page.getByRole('button', { name: 'Générer mon programme' }).tap();
  await page.getByRole('button', { name: 'Commencer' }).tap();
  await page.getByLabel('Sommeil cette nuit').fill('7,5');
  await page.getByRole('button', { name: 'Énergie : 7' }).tap();
  await page.getByText('Non', { exact: true }).tap();
  await page.getByRole('button', { name: 'Voir mon conseil du jour' }).tap();
  await page.getByRole('button', { name: /^Commencer la séance/ }).tap();
  await page.getByLabel('Répétitions — Squat gobelet, série 1').fill('10');
  await page.getByLabel('Charge en kg — Squat gobelet, série 1').fill('16');
  await page.getByRole('button', { name: 'Valider Squat gobelet, série 1' }).tap();
  const workoutId = page.url().split('/').pop() ?? '';
  await page.getByRole('button', { name: 'Terminer la séance' }).first().tap();
  await page.getByRole('dialog').getByRole('button', { name: '6', exact: true }).tap();
  await page.getByRole('button', { name: 'Enregistrer la séance' }).tap();
  await expect(page.getByText('Séance terminée')).toBeVisible();

  // Match au calendrier, demain.
  const tomorrow = await page.evaluate(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  await page.goto(`./#/calendrier/activite/nouvelle?date=${tomorrow}`);
  await page.getByText('Match', { exact: true }).tap();
  await page.getByLabel('Nom').fill('Match de championnat');
  await page.getByRole('button', { name: 'Enregistrer' }).tap();
  await expect(page).not.toHaveURL(/activite/);
  const activityId = await firstKey(page, 'activities');

  // Repas, boisson, mensurations, photo, note de motivation.
  await page.goto('./#/nutrition');
  await page.getByRole('button', { name: '+ 1 verre (250 ml)' }).tap();
  await page.getByRole('link', { name: 'Ajouter : Déjeuner' }).tap();
  await page.getByLabel('Qu’as-tu mangé ?').fill('Riz, poulet, haricots verts');
  await page.getByRole('button', { name: 'Enregistrer' }).tap();
  await page.getByRole('link', { name: /Riz, poulet/ }).tap();
  const mealId = page.url().split('/').pop() ?? '';

  await page.goto('./#/progres/mensurations');
  await page.getByLabel('Tour de bras').fill('31');
  await page.getByRole('button', { name: 'Enregistrer' }).tap();
  await expect(page.getByText('Mensurations enregistrées.')).toBeVisible();

  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 800;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas');
    context.fillStyle = '#335577';
    context.fillRect(0, 0, 600, 800);
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
  await page.getByRole('link', { name: /Ouvrir la photo/ }).first().tap();
  const photoId = page.url().split('/').pop() ?? '';

  await page.goto('./#/coach/motivation');
  await page.getByLabel('Ta note').fill('Être prêt pour la saison');
  await page.getByRole('button', { name: 'Ajouter au journal' }).tap();
  await expect(page.getByRole('list', { name: 'Journal de motivation' })).toBeVisible();

  return { workoutId, mealId, photoId, activityId };
}

test('audit de chaque écran : accessibilité, erreurs, titres, mise en page iPhone', async ({ page }) => {
  test.setTimeout(240_000);
  page.setDefaultTimeout(10_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  const { workoutId, mealId, photoId, activityId } = await seed(page);
  const today = await page.evaluate(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

  const screens = [
    '',
    'entrainement',
    'entrainement/programme',
    'entrainement/programme/A/0',
    `entrainement/historique`,
    `entrainement/historique/${workoutId}`,
    'entrainement/records',
    'calendrier',
    `calendrier/jour/${today}`,
    'calendrier/activite/nouvelle',
    `calendrier/activite/${activityId}`,
    'calendrier/habituel',
    'calendrier/vacances',
    'calendrier/export',
    'calendrier/basket',
    'progres',
    'progres/mensurations',
    'progres/photos',
    'progres/photos/nouvelle',
    `progres/photos/${photoId}`,
    'progres/comparer',
    'plus',
    'recuperation',
    'recuperation/check-in',
    'recuperation/aujourdhui',
    'recuperation/reperes',
    'nutrition',
    'nutrition/repas/nouveau',
    `nutrition/repas/${mealId}`,
    'nutrition/idees',
    'nutrition/proteines',
    'nutrition/historique',
    'nutrition/hydratation',
    'coach',
    'coach/bilans',
    'coach/motivation',
    'profil',
    'profil/modifier/identity',
    'profil/modifier/training',
    'profil/modifier/foods',
    'reglages',
    'reglages/sauvegarde',
    'page-inexistante',
  ];

  const problems: string[] = [];
  for (const screen of screens) {
    await page.goto(`./#/${screen}`);
    await expect(page.getByRole('heading', { level: 1 }).first(), screen).toBeVisible();
    await page.waitForTimeout(300); // fin de l'animation d'entrée
    expect(await page.getByRole('heading', { level: 1 }).count(), `${screen} : un seul titre principal`).toBe(1);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) problems.push(`${screen || 'accueil'} : débordement horizontal de ${overflow} px`);

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    for (const violation of results.violations) {
      problems.push(
        `${screen || 'accueil'} : ${violation.id} (${violation.impact}) — ${violation.nodes
          .slice(0, 3)
          .map((node) => node.target.join(' '))
          .join(' | ')}`,
      );
    }
  }
  expect(problems).toEqual([]);
  expect(errors).toEqual([]);
});
