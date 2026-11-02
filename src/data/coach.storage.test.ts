import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MotivationEntry } from '../domain/coach/types';
import { TEST_NOW } from '../test/fixtures';
import { VyroDatabase, openDatabase } from './db';
import { createCoachRepository } from './repositories/coachRepository';
import { createProgressRepository } from './repositories/progressRepository';
import { createSettingsRepository } from './repositories/settingsRepository';
import { VYRO_SCHEMA } from './schema';

let name: string;
let db: VyroDatabase;

beforeEach(() => {
  name = `vyro-coach-${crypto.randomUUID()}`;
  db = new VyroDatabase(name);
});

afterEach(async () => {
  db.close();
  await Dexie.delete(name);
});

const note = (overrides: Partial<MotivationEntry> = {}): MotivationEntry => ({
  id: crypto.randomUUID(),
  date: '2026-10-20',
  motivation: 8,
  text: 'Être prêt pour la saison',
  createdAt: TEST_NOW,
  ...overrides,
});

describe('journal de motivation', () => {
  it('ajoute, relit après réouverture (ordre chronologique) et supprime', async () => {
    const repo = createCoachRepository(db);
    const later = note({ date: '2026-10-22', text: 'Dunker avant juin' });
    await repo.addMotivation(later);
    await repo.addMotivation(note());
    db.close();
    const reopened = new VyroDatabase(name);
    const list = await createCoachRepository(reopened).listMotivation();
    expect(list.map((entry) => entry.text)).toEqual(['Être prêt pour la saison', 'Dunker avant juin']);
    await createCoachRepository(reopened).removeMotivation(later.id);
    expect(await createCoachRepository(reopened).listMotivation()).toHaveLength(1);
    reopened.close();
  });

  it('refuse une note vide ou une motivation hors limites, signale un enregistrement abîmé', async () => {
    const repo = createCoachRepository(db);
    await expect(repo.addMotivation(note({ text: '  ' }))).rejects.toThrow(RangeError);
    await expect(repo.addMotivation(note({ motivation: 11 }))).rejects.toThrow(RangeError);
    await db.motivation.put({ id: 'x', date: 'hier' } as never);
    await expect(repo.listMotivation()).rejects.toMatchObject({ kind: 'integrity' });
  });
});

describe('migration v6 → v7', () => {
  it('ajoute le journal de motivation et l’état du coach sans toucher aux mensurations', async () => {
    const v6 = new VyroDatabase(name, VYRO_SCHEMA.filter((entry) => entry.version <= 6));
    await openDatabase(v6, 6);
    const measurement = { date: '2026-10-20', arm: 31, chest: null, shoulders: null, waist: 72, notes: '', createdAt: TEST_NOW, updatedAt: TEST_NOW };
    await createProgressRepository(v6).saveMeasurement(measurement, '2026-10-31');
    v6.close();

    await openDatabase(db);
    expect(await createProgressRepository(db).listMeasurements()).toEqual([measurement]);
    expect(await createCoachRepository(db).listMotivation()).toEqual([]);
    const settings = await createSettingsRepository(db).get();
    expect(settings.coach).toEqual({ reviewSeenUntil: null, dismissed: [] });
    expect(settings.backup).toEqual({ lastExportAt: null });
  });
});
