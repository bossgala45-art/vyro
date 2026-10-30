import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Activity, DayOverride } from '../domain/calendar/types';
import { TEST_NOW } from '../test/fixtures';
import { VyroDatabase, openDatabase } from './db';
import { deleteAllData } from './maintenance';
import { createCalendarRepository } from './repositories/calendarRepository';
import { VYRO_SCHEMA } from './schema';

let name: string;
let db: VyroDatabase;

beforeEach(() => {
  name = `vyro-calendar-${crypto.randomUUID()}`;
  db = new VyroDatabase(name);
});

afterEach(async () => {
  db.close();
  await Dexie.delete(name);
});

const match: Activity = {
  id: 'match',
  kind: 'match',
  title: 'Match',
  startTime: '15:00',
  durationMinutes: 120,
  date: null,
  recurrence: { weekday: 5, from: '2026-09-01', until: null },
  notes: '',
  createdAt: TEST_NOW,
  updatedAt: TEST_NOW,
};

describe('migration v2 → v3 (calendrier)', () => {
  it('convertit la semaine type en disponibilités et activités récurrentes, sans inventer d’horaire', async () => {
    const v2 = new VyroDatabase(name, VYRO_SCHEMA.filter((entry) => entry.version <= 2));
    await openDatabase(v2, 2);
    await v2.table('routine').put({
      id: 'me',
      gymDays: [0, 2],
      practiceDays: [1, 3],
      matchDays: [5],
      includeOptionalThird: true,
      updatedAt: '2026-10-15T10:00:00.000Z',
    });
    v2.close();

    await openDatabase(db);
    const data = await createCalendarRepository(db).load();
    expect(data.planning).toMatchObject({
      gymSlots: [
        { weekday: 0, from: null, to: null },
        { weekday: 2, from: null, to: null },
      ],
      includeOptionalThird: true,
    });
    expect(data.activities.map((activity) => [activity.kind, activity.recurrence?.weekday, activity.startTime]).sort()).toEqual([
      ['match', 5, null],
      ['practice', 1, null],
      ['practice', 3, null],
    ]);
    expect(db.tables.map((table) => table.name)).not.toContain('routine');
  });

  it('migre sans erreur quand aucune semaine type n’existait', async () => {
    const v2 = new VyroDatabase(name, VYRO_SCHEMA.filter((entry) => entry.version <= 2));
    await openDatabase(v2, 2);
    v2.close();
    await openDatabase(db);
    const data = await createCalendarRepository(db).load();
    expect(data.planning).toBeNull();
    expect(data.activities).toEqual([]);
  });
});

describe('dépôt calendrier', () => {
  it('enregistre activités, exceptions et suivis, et refuse des données invalides', async () => {
    const repo = createCalendarRepository(db);
    await repo.saveActivity(match);
    await repo.setException({ id: 'e1', activityId: 'match', date: '2026-10-24', action: 'cancel', newDate: null, newStartTime: null, createdAt: TEST_NOW });
    // Remplace le changement précédent pour la même occurrence.
    await repo.setException({ id: 'e2', activityId: 'match', date: '2026-10-24', action: 'move', newDate: '2026-10-25', newStartTime: '10:00', createdAt: TEST_NOW });
    const data = await repo.load();
    expect(data.exceptions).toHaveLength(1);
    expect(data.exceptions[0]?.action).toBe('move');
    await expect(repo.saveActivity({ ...match, startTime: '25:99' })).rejects.toThrow(RangeError);
  });

  it('supprimer une activité garde l’historique des matchs joués', async () => {
    const repo = createCalendarRepository(db);
    await repo.saveActivity(match);
    await repo.saveLog({
      id: 'match@2026-10-17',
      activityId: 'match',
      kind: 'match',
      date: '2026-10-17',
      played: true,
      intensity: 8,
      minutesPlayed: 25,
      points: 10,
      rebounds: 4,
      assists: 2,
      notes: '',
      updatedAt: TEST_NOW,
    });
    await repo.setException({ id: 'e', activityId: 'match', date: '2026-10-24', action: 'cancel', newDate: null, newStartTime: null, createdAt: TEST_NOW });
    await repo.deleteActivity('match');
    const data = await repo.load();
    expect(data.activities).toEqual([]);
    expect(data.exceptions).toEqual([]);
    expect(data.logs).toHaveLength(1);
  });

  it('ne conserve pas un réglage de journée vide', async () => {
    const repo = createCalendarRepository(db);
    const override: DayOverride = { date: '2026-10-21', rest: true, gymUnavailable: false, gymWindow: null, fatigue: false, note: '', updatedAt: TEST_NOW };
    await repo.saveOverride(override);
    expect((await repo.load()).overrides).toHaveLength(1);
    await repo.saveOverride({ ...override, rest: false });
    expect((await repo.load()).overrides).toEqual([]);
  });

  it('signale une activité abîmée', async () => {
    await db.activities.put({ id: 'x', kind: 'match' } as never);
    await expect(createCalendarRepository(db).load()).rejects.toMatchObject({ kind: 'integrity' });
  });

  it('l’effacement des données vide aussi le calendrier', async () => {
    const repo = createCalendarRepository(db);
    await repo.saveActivity(match);
    await deleteAllData(db);
    expect((await repo.load()).activities).toEqual([]);
  });
});
