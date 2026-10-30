import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_HYDRATION, type DrinkEntry, type MealEntry, type MealPhoto } from '../domain/nutrition/types';
import type { CheckIn } from '../domain/recovery/types';
import { TEST_NOW } from '../test/fixtures';
import { VyroDatabase, openDatabase } from './db';
import { createNutritionRepository } from './repositories/nutritionRepository';
import { createRecoveryRepository } from './repositories/recoveryRepository';
import { createSettingsRepository } from './repositories/settingsRepository';
import { VYRO_SCHEMA } from './schema';

let name: string;
let db: VyroDatabase;

beforeEach(() => {
  name = `vyro-nutrition-${crypto.randomUUID()}`;
  db = new VyroDatabase(name);
});

afterEach(async () => {
  vi.restoreAllMocks();
  db.close();
  await Dexie.delete(name);
});

const meal = (overrides: Partial<MealEntry> = {}): MealEntry => ({
  id: 'm1',
  date: '2026-10-20',
  slot: 'lunch',
  skipped: false,
  description: 'Riz poulet',
  portion: null,
  protein: true,
  fruitOrVegetable: null,
  photoId: null,
  notes: '',
  createdAt: TEST_NOW,
  updatedAt: TEST_NOW,
  ...overrides,
});

const photo = (id: string, mealId = 'm1', size = 2048): MealPhoto => ({
  id,
  mealId,
  mimeType: 'image/jpeg',
  data: new Uint8Array(size).fill(7).buffer,
  width: 1280,
  height: 960,
  createdAt: TEST_NOW,
});

const drink = (overrides: Partial<DrinkEntry> = {}): DrinkEntry => ({
  id: crypto.randomUUID(),
  date: '2026-10-20',
  time: '10:00',
  ml: 250,
  createdAt: TEST_NOW,
  ...overrides,
});

const quotaError = () => new DOMException('Quota exceeded', 'QuotaExceededError');

describe('journal des repas', () => {
  it('conserve un repas avec sa portion inconnue (aucune quantité inventée)', async () => {
    const repo = createNutritionRepository(db);
    await repo.saveMeal(meal());
    db.close();
    const reopened = new VyroDatabase(name);
    const [saved] = await createNutritionRepository(reopened).listMeals();
    expect(saved).toMatchObject({ portion: null, fruitOrVegetable: null, description: 'Riz poulet' });
    reopened.close();
  });

  it('enregistre la photo à part, la remplace puis la supprime définitivement', async () => {
    const repo = createNutritionRepository(db);
    const saved = await repo.saveMeal(meal(), { action: 'replace', photo: photo('p1') });
    expect(saved.photoId).toBe('p1');
    expect((await repo.getPhoto('p1'))?.data.byteLength).toBe(2048);

    await repo.saveMeal({ ...saved, description: 'Riz poulet haricots' }, { action: 'replace', photo: photo('p2') });
    expect(await repo.getPhoto('p1')).toBeNull();
    expect((await repo.getMeal('m1'))?.photoId).toBe('p2');

    await repo.saveMeal({ ...saved, photoId: 'p2' }, { action: 'remove' });
    expect(await db.mealPhotos.count()).toBe(0);
    expect((await repo.getMeal('m1'))?.photoId).toBeNull();
  });

  it('modifier le texte d’un repas garde sa photo', async () => {
    const repo = createNutritionRepository(db);
    await repo.saveMeal(meal(), { action: 'replace', photo: photo('p1') });
    await repo.saveMeal(meal({ description: 'Autre' }));
    expect((await repo.getMeal('m1'))?.photoId).toBe('p1');
  });

  it('supprimer un repas supprime aussi sa photo', async () => {
    const repo = createNutritionRepository(db);
    await repo.saveMeal(meal(), { action: 'replace', photo: photo('p1') });
    await repo.saveMeal(meal({ id: 'm2' }), { action: 'replace', photo: photo('p2', 'm2') });
    await repo.removeMeal('m1');
    expect((await repo.listMeals()).map((item) => item.id)).toEqual(['m2']);
    expect(await db.mealPhotos.toCollection().primaryKeys()).toEqual(['p2']);
  });

  it('espace plein : ni le repas ni la photo ne sont modifiés, et l’erreur est explicite', async () => {
    const repo = createNutritionRepository(db);
    await repo.saveMeal(meal(), { action: 'replace', photo: photo('p1') });
    vi.spyOn(db.mealPhotos, 'put').mockRejectedValueOnce(quotaError());

    await expect(repo.saveMeal(meal({ description: 'Nouveau' }), { action: 'replace', photo: photo('p2') })).rejects.toMatchObject({
      kind: 'quota',
    });
    expect((await repo.getMeal('m1'))?.description).toBe('Riz poulet');
    expect((await repo.getMeal('m1'))?.photoId).toBe('p1');
    expect(await repo.getPhoto('p1')).not.toBeNull();
  });

  it('refuse un repas invalide ou une photo d’un autre repas, et signale un enregistrement abîmé', async () => {
    const repo = createNutritionRepository(db);
    await expect(repo.saveMeal(meal({ description: '' }))).rejects.toThrow(RangeError);
    await expect(repo.saveMeal(meal(), { action: 'replace', photo: photo('p1', 'autre') })).rejects.toThrow(RangeError);
    await expect(repo.saveMeal(meal(), { action: 'replace', photo: { ...photo('p1'), data: new ArrayBuffer(0) } })).rejects.toThrow(RangeError);
    await db.meals.put({ id: 'x', date: 'hier' } as never);
    await expect(repo.listMeals()).rejects.toMatchObject({ kind: 'integrity' });
  });
});

describe('hydratation', () => {
  it('ajoute et retire des boissons ; refuse une quantité aberrante', async () => {
    const repo = createNutritionRepository(db);
    const first = drink();
    await repo.addDrink(first);
    await repo.addDrink(drink({ ml: 500, time: '12:00' }));
    await expect(repo.addDrink(drink({ ml: 25_000 }))).rejects.toThrow(RangeError);
    await repo.removeDrink(first.id);
    expect((await repo.listDrinks()).map((item) => item.ml)).toEqual([500]);
  });

  it('fournit les repères par défaut et conserve les réglages', async () => {
    const settings = createSettingsRepository(db);
    expect((await settings.get()).nutrition.hydration).toEqual(DEFAULT_HYDRATION);
    await settings.update((current) => ({ ...current, nutrition: { hydration: { ...current.nutrition.hydration, glassMl: 330 } } }));
    expect((await settings.get()).nutrition.hydration.glassMl).toBe(330);
  });
});

describe('migration v4 → v5', () => {
  it('ajoute les tables de nutrition sans toucher aux check-ins ni aux réglages', async () => {
    const v4 = new VyroDatabase(name, VYRO_SCHEMA.filter((entry) => entry.version <= 4));
    await openDatabase(v4, 4);
    const checkIn: CheckIn = {
      date: '2026-10-20',
      sleepHours: 7,
      energy: 6,
      motivation: 7,
      soreness: 'none',
      pain: false,
      painZones: [],
      painIntensity: null,
      availableMinutes: null,
      notes: '',
      createdAt: TEST_NOW,
      updatedAt: TEST_NOW,
    };
    await createRecoveryRepository(v4).save(checkIn);
    await createSettingsRepository(v4).update((settings) => ({ ...settings, privacy: { hideWhenInactive: false } }));
    v4.close();

    await openDatabase(db);
    expect(await createRecoveryRepository(db).list()).toEqual([checkIn]);
    const settings = await createSettingsRepository(db).get();
    expect(settings.privacy.hideWhenInactive).toBe(false);
    expect(settings.nutrition.hydration).toEqual(DEFAULT_HYDRATION);
    expect(await createNutritionRepository(db).listMeals()).toEqual([]);
  });
});
