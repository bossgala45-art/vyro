import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MealEntry } from '../domain/nutrition/types';
import type { MeasurementEntry, ProgressPhoto, ProgressPhotoFile } from '../domain/progress/types';
import { TEST_NOW } from '../test/fixtures';
import { BACKUP_TABLES } from './backupTables';
import { VyroDatabase, openDatabase } from './db';
import { createNutritionRepository } from './repositories/nutritionRepository';
import { createProgressRepository } from './repositories/progressRepository';
import { VYRO_SCHEMA } from './schema';

let name: string;
let db: VyroDatabase;

beforeEach(() => {
  name = `vyro-progress-${crypto.randomUUID()}`;
  db = new VyroDatabase(name);
});

afterEach(async () => {
  vi.restoreAllMocks();
  db.close();
  await Dexie.delete(name);
});

const measure = (date: string, overrides: Partial<MeasurementEntry> = {}): MeasurementEntry => ({
  date,
  arm: 31,
  chest: null,
  shoulders: null,
  waist: 72,
  notes: '',
  createdAt: TEST_NOW,
  updatedAt: TEST_NOW,
  ...overrides,
});

const photo = (id: string, date = '2026-10-20'): ProgressPhoto => ({
  id,
  date,
  pose: 'front',
  width: 1200,
  height: 1600,
  bytes: 4096,
  thumbnail: { mimeType: 'image/jpeg', data: new Uint8Array(512).fill(3).buffer, width: 270, height: 360 },
  notes: '',
  createdAt: TEST_NOW,
});

const file = (id: string): ProgressPhotoFile => ({ id, mimeType: 'image/jpeg', data: new Uint8Array(4096).fill(9).buffer });

describe('mensurations', () => {
  it('une saisie par date, la dernière remplace la précédente, conservée après réouverture', async () => {
    const repo = createProgressRepository(db);
    await repo.saveMeasurement(measure('2026-10-01'), '2026-10-31');
    await repo.saveMeasurement(measure('2026-10-20'), '2026-10-31');
    await repo.saveMeasurement(measure('2026-10-20', { arm: 31.5 }), '2026-10-31');
    db.close();
    const reopened = new VyroDatabase(name);
    expect((await createProgressRepository(reopened).listMeasurements()).map((entry) => [entry.date, entry.arm])).toEqual([
      ['2026-10-01', 31],
      ['2026-10-20', 31.5],
    ]);
    reopened.close();
  });

  it('refuse une saisie invalide et signale un enregistrement abîmé', async () => {
    const repo = createProgressRepository(db);
    await expect(repo.saveMeasurement(measure('2026-10-20', { arm: 500 }), '2026-10-31')).rejects.toThrow(RangeError);
    await db.measurements.put({ date: '2026-10-21', arm: 'gros' } as never);
    await expect(repo.listMeasurements()).rejects.toMatchObject({ kind: 'integrity' });
  });
});

describe('photos de progression', () => {
  it('stocke la miniature et l’image complète à part, puis les relit', async () => {
    const repo = createProgressRepository(db);
    await repo.addPhoto(photo('p1'), file('p1'));
    db.close();
    const reopened = createProgressRepository(new VyroDatabase(name));
    const [stored] = await reopened.listPhotos();
    expect(stored?.thumbnail.data.byteLength).toBe(512);
    expect((await reopened.getPhotoFile('p1'))?.data.byteLength).toBe(4096);
  });

  it('espace plein : ni miniature ni image ne sont enregistrées, l’erreur est explicite', async () => {
    const repo = createProgressRepository(db);
    vi.spyOn(db.progressPhotos, 'add').mockRejectedValueOnce(new DOMException('Quota exceeded', 'QuotaExceededError'));
    await expect(repo.addPhoto(photo('p1'), file('p1'))).rejects.toMatchObject({ kind: 'quota' });
    expect(await db.progressPhotos.count()).toBe(0);
    expect(await db.progressPhotoFiles.count()).toBe(0);
  });

  it('suppression définitive d’une photo, puis de toutes', async () => {
    const repo = createProgressRepository(db);
    await repo.addPhoto(photo('p1'), file('p1'));
    await repo.addPhoto(photo('p2', '2026-10-25'), file('p2'));
    await repo.removePhoto('p1');
    expect((await repo.listPhotos()).map((item) => item.id)).toEqual(['p2']);
    expect(await repo.getPhotoFile('p1')).toBeNull();

    await repo.removeAllPhotos();
    expect(await db.progressPhotos.count()).toBe(0);
    expect(await db.progressPhotoFiles.count()).toBe(0);
  });

  it('refuse une photo incohérente (image vide, identifiants différents)', async () => {
    const repo = createProgressRepository(db);
    await expect(repo.addPhoto(photo('p1'), file('p2'))).rejects.toThrow(RangeError);
    await expect(repo.addPhoto(photo('p1'), { ...file('p1'), data: new ArrayBuffer(0) })).rejects.toThrow(RangeError);
    await db.progressPhotos.put({ id: 'x', date: '2026-10-20', pose: 'face' } as never);
    await expect(repo.listPhotos()).rejects.toMatchObject({ kind: 'integrity' });
  });
});

describe('migration v5 → v6', () => {
  it('ajoute les tables de progression sans toucher au journal alimentaire', async () => {
    const v5 = new VyroDatabase(name, VYRO_SCHEMA.filter((entry) => entry.version <= 5));
    await openDatabase(v5, 5);
    const meal: MealEntry = {
      id: 'm1',
      date: '2026-10-20',
      slot: 'lunch',
      skipped: false,
      description: 'Riz',
      portion: null,
      protein: null,
      fruitOrVegetable: null,
      photoId: null,
      notes: '',
      createdAt: TEST_NOW,
      updatedAt: TEST_NOW,
    };
    await createNutritionRepository(v5).saveMeal(meal);
    v5.close();

    await openDatabase(db);
    expect(await createNutritionRepository(db).listMeals()).toEqual([meal]);
    expect(await createProgressRepository(db).listPhotos()).toEqual([]);
  });
});

describe('préparation de la sauvegarde', () => {
  it('chaque table du schéma est inventoriée, photos comprises', () => {
    expect(db.tables.map((table) => table.name).sort()).toEqual(Object.keys(BACKUP_TABLES).sort());
    expect(BACKUP_TABLES.progressPhotoFiles).toBe('binary');
    expect(BACKUP_TABLES.mealPhotos).toBe('binary');
  });
});
