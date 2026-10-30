import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_THRESHOLDS, type CheckIn } from '../domain/recovery/types';
import { TEST_NOW } from '../test/fixtures';
import { VyroDatabase, openDatabase } from './db';
import { createCalendarRepository } from './repositories/calendarRepository';
import { createRecoveryRepository } from './repositories/recoveryRepository';
import { createSettingsRepository } from './repositories/settingsRepository';
import { VYRO_SCHEMA } from './schema';

let name: string;
let db: VyroDatabase;

beforeEach(() => {
  name = `vyro-recovery-${crypto.randomUUID()}`;
  db = new VyroDatabase(name);
});

afterEach(async () => {
  db.close();
  await Dexie.delete(name);
});

const checkIn = (date: string, overrides: Partial<CheckIn> = {}): CheckIn => ({
  date,
  sleepHours: 7,
  energy: 6,
  motivation: 7,
  soreness: 'light',
  pain: false,
  painZones: [],
  painIntensity: null,
  availableMinutes: 75,
  notes: '',
  createdAt: TEST_NOW,
  updatedAt: TEST_NOW,
  ...overrides,
});

describe('check-ins', () => {
  it('conserve un check-in par jour, le dernier remplaçant le précédent', async () => {
    const repo = createRecoveryRepository(db);
    await repo.save(checkIn('2026-10-20'));
    await repo.save(checkIn('2026-10-21', { sleepHours: 5 }));
    await repo.save(checkIn('2026-10-21', { sleepHours: 6.5 }));
    db.close();

    const reopened = new VyroDatabase(name);
    const list = await createRecoveryRepository(reopened).list();
    expect(list.map((item) => [item.date, item.sleepHours])).toEqual([
      ['2026-10-20', 7],
      ['2026-10-21', 6.5],
    ]);
    reopened.close();
  });

  it('refuse des réponses hors limites et signale un enregistrement abîmé', async () => {
    const repo = createRecoveryRepository(db);
    await expect(repo.save(checkIn('2026-10-21', { energy: 12 }))).rejects.toThrow(RangeError);
    await db.checkIns.put({ date: '2026-10-22', energy: 'beaucoup' } as never);
    await expect(repo.list()).rejects.toMatchObject({ kind: 'integrity' });
  });

  it('supprime un check-in', async () => {
    const repo = createRecoveryRepository(db);
    await repo.save(checkIn('2026-10-21'));
    await repo.remove('2026-10-21');
    expect(await repo.list()).toEqual([]);
  });
});

describe('migration v3 → v4', () => {
  it('ajoute les check-ins sans toucher au calendrier existant', async () => {
    const v3 = new VyroDatabase(name, VYRO_SCHEMA.filter((entry) => entry.version <= 3));
    await openDatabase(v3, 3);
    await createCalendarRepository(v3).savePlanning({ id: 'me', gymSlots: [{ weekday: 0, from: null, to: null }], includeOptionalThird: false, updatedAt: TEST_NOW });
    v3.close();

    await openDatabase(db);
    expect((await createCalendarRepository(db).load()).planning?.gymSlots).toHaveLength(1);
    expect(await createRecoveryRepository(db).list()).toEqual([]);
  });
});

describe('seuils de récupération', () => {
  it('fournit les repères par défaut et conserve les réglages', async () => {
    const repo = createSettingsRepository(db);
    expect((await repo.get()).recovery.thresholds).toEqual(DEFAULT_THRESHOLDS);
    await repo.update((settings) => ({ ...settings, recovery: { thresholds: { ...settings.recovery.thresholds, shortSleepHours: 7 } } }));
    expect((await repo.get()).recovery.thresholds.shortSleepHours).toBe(7);
  });

  it('revient aux valeurs par défaut si les réglages enregistrés sont incohérents', async () => {
    await db.settings.put({ id: 'app', recovery: { thresholds: { ...DEFAULT_THRESHOLDS, veryShortSleepHours: 9 } } } as never);
    expect((await createSettingsRepository(db).get()).recovery.thresholds).toEqual(DEFAULT_THRESHOLDS);
  });
});
