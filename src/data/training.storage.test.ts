import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildProfile } from '../domain/profile/draft';
import { generateProgram } from '../domain/training/program';
import { createWorkout } from '../domain/training/workout';
import type { WeeklyRoutine } from '../domain/training/types';
import { TEST_NOW, TEST_TODAY, validDraft } from '../test/fixtures';
import { VyroDatabase, openDatabase } from './db';
import { deleteAllData } from './maintenance';
import { createBodyWeightRepository } from './repositories/bodyWeightRepository';
import { createProfileRepository } from './repositories/profileRepository';
import { createTrainingRepository } from './repositories/trainingRepository';
import { VYRO_SCHEMA } from './schema';

let name: string;
let db: VyroDatabase;

const profile = () => buildProfile(validDraft(), { today: TEST_TODAY, requireWeight: true, now: TEST_NOW });
const makeProgram = (id: string) => generateProgram({ id, now: `2026-10-${id === 'p1' ? '01' : '02'}T00:00:00.000Z`, profile: profile() }).program;
const routine: WeeklyRoutine = { id: 'me', gymDays: [0, 2], practiceDays: [1, 3], matchDays: [5], includeOptionalThird: false, updatedAt: TEST_NOW };

beforeEach(() => {
  name = `vyro-training-${crypto.randomUUID()}`;
  db = new VyroDatabase(name);
});

afterEach(async () => {
  db.close();
  await Dexie.delete(name);
});

describe('migration v1 → v2 (musculation)', () => {
  it('conserve le profil, les pesées et les réglages existants', async () => {
    const v1 = new VyroDatabase(name, VYRO_SCHEMA.filter((entry) => entry.version === 1));
    await openDatabase(v1, 1);
    await createProfileRepository(v1).create(profile(), { date: TEST_TODAY, kg: 58, createdAt: TEST_NOW });
    v1.close();

    await openDatabase(db);
    expect(db.backendDB().version / 10).toBe(2);
    expect(await createProfileRepository(db).get()).toEqual(profile());
    expect(await createBodyWeightRepository(db).list()).toHaveLength(1);
    expect(await createTrainingRepository(db).getRoutine()).toBeNull();
    expect(await createTrainingRepository(db).listWorkouts()).toEqual([]);
  });
});

describe('dépôt musculation', () => {
  it('enregistre et relit la semaine type', async () => {
    const repo = createTrainingRepository(db);
    await repo.saveRoutine(routine);
    expect(await repo.getRoutine()).toEqual(routine);
    await expect(repo.saveRoutine({ ...routine, gymDays: [9 as never] })).rejects.toThrow(RangeError);
  });

  it('active un nouveau programme en conservant l’ancien', async () => {
    const repo = createTrainingRepository(db);
    await repo.activateNewProgram(makeProgram('p1'));
    await repo.activateNewProgram(makeProgram('p2'));
    expect((await repo.getActiveProgram())?.id).toBe('p2');
    expect(await db.programs.count()).toBe(2);
    expect((await db.programs.get('p1'))?.active).toBe(false);
  });

  it('refuse un programme modifié avec des valeurs invalides', async () => {
    const repo = createTrainingRepository(db);
    const program = makeProgram('p1');
    await repo.activateNewProgram(program);
    const broken = structuredClone(program);
    const slot = broken.templates[0]?.slots[0];
    if (slot) slot.repMax = 0;
    await expect(repo.updateProgram(broken)).rejects.toThrow(RangeError);
    expect((await repo.getActiveProgram())?.templates[0]?.slots[0]?.repMax).toBe(10);
  });

  it('ne démarre jamais deux séances en parallèle', async () => {
    const repo = createTrainingRepository(db);
    const program = makeProgram('p1');
    const first = createWorkout({ id: 'w1', program, templateKey: 'A', date: TEST_TODAY, now: TEST_NOW, light: false, history: [] });
    const second = { ...first, id: 'w2', templateKey: 'B' as const };
    expect((await repo.startWorkout(first)).id).toBe('w1');
    expect((await repo.startWorkout(second)).id).toBe('w1');
    expect(await repo.listWorkouts()).toHaveLength(1);
  });

  it('conserve chaque saisie de la séance en cours (réouverture de l’app)', async () => {
    const repo = createTrainingRepository(db);
    const workout = createWorkout({ id: 'w1', program: makeProgram('p1'), templateKey: 'A', date: TEST_TODAY, now: TEST_NOW, light: false, history: [] });
    await repo.startWorkout(workout);
    const exercise = workout.exercises[0];
    if (!exercise) throw new Error();
    exercise.sets[0] = { reps: 9, loadKg: 60, rir: 2, done: true };
    await repo.saveWorkout(workout);
    db.close();

    const reopened = new VyroDatabase(name);
    expect((await createTrainingRepository(reopened).getWorkout('w1'))?.exercises[0]?.sets[0]).toEqual({
      reps: 9,
      loadKg: 60,
      rir: 2,
      done: true,
    });
    reopened.close();
  });

  it('signale une séance abîmée au lieu de l’ignorer', async () => {
    await db.workouts.put({ id: 'x', date: TEST_TODAY } as never);
    await expect(createTrainingRepository(db).listWorkouts()).rejects.toMatchObject({ kind: 'integrity' });
  });

  it('l’effacement des données supprime aussi la musculation', async () => {
    const repo = createTrainingRepository(db);
    await repo.saveRoutine(routine);
    await repo.activateNewProgram(makeProgram('p1'));
    await deleteAllData(db);
    expect(await repo.getRoutine()).toBeNull();
    expect(await repo.getActiveProgram()).toBeNull();
  });
});
