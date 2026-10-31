import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { nowIso, todayIso } from '../../app/clock';
import { db } from '../../data/db';
import { StorageError } from '../../data/errors';
import { calendarRepository } from '../../data/repositories/calendarRepository';
import { nutritionRepository } from '../../data/repositories/nutritionRepository';
import { settingsRepository } from '../../data/repositories/settingsRepository';
import type { MealEntry } from '../../domain/nutrition/types';
import { renderRoute, resetDatabase, seedProfile } from '../../test/renderRoute';
import * as photo from './photo';

vi.mock('./photo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./photo')>();
  return { ...actual, preparePhoto: vi.fn(actual.preparePhoto) };
});

type User = ReturnType<typeof userEvent.setup>;
const today = todayIso();

beforeAll(() => {
  // jsdom ne fournit pas d'URL locale pour les images.
  Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:vyro-test', writable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: () => undefined, writable: true });
});

beforeEach(async () => {
  vi.restoreAllMocks();
  await resetDatabase();
});

const meal = (overrides: Partial<MealEntry> = {}): MealEntry => ({
  id: crypto.randomUUID(),
  date: today,
  slot: 'lunch',
  skipped: false,
  description: 'Pâtes bolognaise',
  portion: 'normal',
  protein: true,
  fruitOrVegetable: null,
  photoId: null,
  notes: '',
  createdAt: nowIso(),
  updatedAt: nowIso(),
  ...overrides,
});

const fakePhoto = (mealId: string) => ({
  id: 'photo-1',
  mealId,
  mimeType: 'image/jpeg',
  data: new Uint8Array(1024).fill(1).buffer,
  width: 1280,
  height: 960,
  createdAt: nowIso(),
});

async function pickPhoto(user: User, name = 'repas.jpg', type = 'image/jpeg') {
  await user.upload(screen.getByLabelText('Choisir une photo du repas'), new File(['x'], name, { type }));
}

describe('journal des repas', () => {
  beforeEach(async () => {
    await seedProfile();
  });

  it('ajoute un repas à portion inconnue sans rien inventer', async () => {
    const user = userEvent.setup();
    renderRoute('/nutrition');
    await user.click(await screen.findByRole('link', { name: 'Ajouter : Déjeuner' }));
    expect(await screen.findByLabelText('Déjeuner')).toBeChecked();
    await user.type(screen.getByLabelText('Qu’as-tu mangé ?'), 'Riz, poulet');
    await user.click(screen.getAllByLabelText('Je ne sais pas')[0] as HTMLElement);
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    const link = await screen.findByRole('link', { name: /Riz, poulet/ });
    expect(link).toHaveTextContent('Portion : non précisée');
    const [saved] = await nutritionRepository.listMeals();
    expect(saved).toMatchObject({ portion: null, protein: null, fruitOrVegetable: null, slot: 'lunch' });
  });

  it('exige une description pour un repas pris, pas pour un repas sauté', async () => {
    const user = userEvent.setup();
    renderRoute('/nutrition/repas/nouveau?moment=breakfast');
    await user.click(await screen.findByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Décris ce que tu as mangé, en quelques mots.')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Je l’ai sauté'));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Repas sauté')).toBeInTheDocument();
    expect((await nutritionRepository.listMeals())[0]).toMatchObject({ slot: 'breakfast', skipped: true });
  });

  it('photo : ajoutée en illustration, sans analyse, puis retirée définitivement', async () => {
    const user = userEvent.setup();
    vi.mocked(photo.preparePhoto).mockImplementationOnce(async (_file, mealId) => fakePhoto(mealId));
    renderRoute('/nutrition/repas/nouveau?moment=dinner');
    expect(await screen.findByText(/Analyse automatique désactivée/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Qu’as-tu mangé ?'), 'Omelette');
    await pickPhoto(user);
    expect(await screen.findByRole('img', { name: 'Photo du repas' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await user.click(await screen.findByRole('link', { name: /Omelette/ }));
    expect(await screen.findByRole('img', { name: 'Photo du repas' })).toBeInTheDocument();
    expect(await db.mealPhotos.count()).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Retirer la photo' }));
    expect(screen.queryByRole('img', { name: 'Photo du repas' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(async () => expect(await db.mealPhotos.count()).toBe(0));
    expect((await nutritionRepository.listMeals())[0]?.photoId).toBeNull();
  });

  it('photo illisible ou fichier non image : message clair, rien n’est ajouté', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderRoute('/nutrition/repas/nouveau?moment=lunch');
    await screen.findByLabelText('Qu’as-tu mangé ?');
    await pickPhoto(user, 'notes.txt', 'text/plain');
    expect(await screen.findByText('Ce fichier n’est pas une image.')).toBeInTheDocument();
    await pickPhoto(user);
    expect(await screen.findByText(/Image illisible/)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Photo du repas' })).not.toBeInTheDocument();
  });

  it('espace plein : message explicite et saisie conservée', async () => {
    const user = userEvent.setup();
    vi.spyOn(nutritionRepository, 'saveMeal').mockRejectedValueOnce(new StorageError('quota'));
    renderRoute('/nutrition/repas/nouveau?moment=lunch');
    await user.type(await screen.findByLabelText('Qu’as-tu mangé ?'), 'Lentilles');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText(/Espace de stockage insuffisant/)).toBeInTheDocument();
    expect(screen.getByLabelText('Qu’as-tu mangé ?')).toHaveValue('Lentilles');
  });

  it('supprime un repas et sa photo après confirmation', async () => {
    const user = userEvent.setup();
    const entry = meal({ id: 'm1' });
    await nutritionRepository.saveMeal(entry, { action: 'replace', photo: fakePhoto('m1') });
    renderRoute('/nutrition/repas/m1');
    await user.click(await screen.findByRole('button', { name: 'Supprimer ce repas' }));
    expect(screen.getByText(/et sa photo seront supprimés définitivement/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Supprimer' }));
    await waitFor(async () => expect(await nutritionRepository.listMeals()).toEqual([]));
    expect(await db.mealPhotos.count()).toBe(0);
  });

  it('les habitudes comptent à part les portions et réponses inconnues', async () => {
    await nutritionRepository.saveMeal(meal({ portion: null }));
    await nutritionRepository.saveMeal(meal({ portion: 'large', slot: 'dinner' }));
    renderRoute('/nutrition/historique');
    expect(await screen.findByText('0 petite(s), 0 normale(s), 1 grande(s), 1 non précisée(s)')).toBeInTheDocument();
    expect(screen.getByText('2 repas sur 2')).toBeInTheDocument();
    expect(screen.getByText('pas encore de réponse')).toBeInTheDocument();
    expect(screen.getByText('pas de boisson notée')).toBeInTheDocument();
  });
});

describe('aliments refusés', () => {
  it('ne sont jamais proposés dans les idées ni les sources de protéines', async () => {
    const user = userEvent.setup();
    await seedProfile({ foodsRefused: ['poisson', 'Œufs'], foodsLiked: ['Lentilles', 'Quinoa'] });
    renderRoute('/nutrition/idees');
    expect(await screen.findByText('Aliments refusés écartés : poisson, Œufs.')).toBeInTheDocument();
    expect(screen.getByText(/Non reconnus, donc pas pris en compte : Quinoa/)).toBeInTheDocument();
    for (const moment of ['Petit-déj', 'Repas', 'Collation', 'Avant le sport', 'Après le sport']) {
      await user.click(screen.getByLabelText(moment));
      expect(screen.queryByText(/Thon en boîte|Sardines|Maquereau|Œufs ·|· Œufs/)).not.toBeInTheDocument();
    }
    await user.click(screen.getByLabelText('Repas'));
    expect(screen.getAllByRole('heading', { level: 2 })[0]).toHaveTextContent('Lentilles et riz');

    renderRoute('/nutrition/proteines');
    const sources = await screen.findByRole('list', { name: 'Sources de protéines' });
    expect(within(sources).queryByText(/Œufs|Thon/)).not.toBeInTheDocument();
    expect(within(sources).getByText('Lentilles ★')).toBeInTheDocument();
    expect(screen.getByText(/environ 70 à 116 g par jour/)).toBeInTheDocument();
  });
});

describe('jours de basket', () => {
  beforeEach(async () => {
    await seedProfile();
  });

  it('jour de match : conseils adaptés et repère d’hydratation augmenté', async () => {
    await calendarRepository.saveActivity({
      id: 'match',
      kind: 'match',
      title: 'Match',
      startTime: '15:00',
      durationMinutes: 120,
      date: today,
      recurrence: null,
      notes: '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    renderRoute('/nutrition');
    expect(await screen.findByText('Jour de match')).toBeInTheDocument();
    expect(screen.getByText(/environ 3 h avant \(vers 12 h 00\)/)).toBeInTheDocument();
    expect(screen.getByText('sur un repère de 2 500 ml')).toBeInTheDocument();
    expect(screen.getByText(/\+ 500 ml \(1 séance de sport aujourd’hui\)/)).toBeInTheDocument();
  });

  it('jour sans sport : repère de base et conseils sans restriction', async () => {
    renderRoute('/nutrition');
    expect(await screen.findByText('Jour sans sport')).toBeInTheDocument();
    expect(screen.getByText('sur un repère de 2 000 ml')).toBeInTheDocument();
    const advice = screen.getByRole('heading', { name: 'Conseils du jour' }).parentElement as HTMLElement;
    expect(advice).not.toHaveTextContent(/calorie|réduis|moins manger/i);
  });

  it('les idées s’ouvrent sur « avant le sport » un jour d’entraînement', async () => {
    await calendarRepository.saveActivity({
      id: 'practice',
      kind: 'practice',
      title: 'Entraînement',
      startTime: '18:30',
      durationMinutes: 90,
      date: today,
      recurrence: null,
      notes: '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    renderRoute('/nutrition/idees');
    expect(await screen.findByLabelText('Avant le sport')).toBeChecked();
    expect(screen.getByText('Moment choisi d’après ton calendrier du jour.')).toBeInTheDocument();
  });
});

describe('hydratation', () => {
  beforeEach(async () => {
    await seedProfile();
  });

  it('ajoute des verres, annule le dernier ajout', async () => {
    const user = userEvent.setup();
    renderRoute('/nutrition');
    await user.click(await screen.findByRole('button', { name: '+ 1 verre (250 ml)' }));
    await user.click(screen.getByRole('button', { name: '+ 500 ml' }));
    expect(await screen.findByText('750 ml')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Hydratation du jour' })).toHaveAttribute('aria-valuenow', '750');
    await user.click(screen.getByRole('button', { name: /Annuler le dernier ajout \(500 ml/ }));
    expect(await screen.findByText('250 ml')).toBeInTheDocument();
  });

  it('l’accueil propose l’ajout rapide', async () => {
    const user = userEvent.setup();
    renderRoute('/');
    await user.click(await screen.findByRole('button', { name: '+ 1 verre (250 ml)' }));
    await waitFor(async () => expect(await nutritionRepository.listDrinks()).toHaveLength(1));
  });

  it('réglages : valeurs incohérentes refusées, rappels enregistrés', async () => {
    const user = userEvent.setup();
    renderRoute('/nutrition/hydratation');
    const goal = await screen.findByLabelText('Repère quotidien');
    await user.clear(goal);
    await user.type(goal, '9000');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Entre 1 000 et 4 000 ml.')).toBeInTheDocument();

    await user.clear(goal);
    await user.type(goal, '2200');
    await user.click(screen.getByRole('switch', { name: 'Rappels dans VYRO' }));
    await user.click(screen.getByLabelText('1 h 30'));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Réglages enregistrés.')).toBeInTheDocument();
    const { hydration } = (await settingsRepository.get()).nutrition;
    expect(hydration).toMatchObject({ baseGoalMl: 2200, reminders: { enabled: true, everyMinutes: 90 } });
    expect(screen.getByText(/Une application web ne peut pas programmer elle-même de notification/)).toBeInTheDocument();
  });
});
