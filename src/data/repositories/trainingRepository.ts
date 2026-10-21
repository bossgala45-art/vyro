import { isStoredProgram, isStoredWorkout, validateSlot } from '../../domain/training/integrity';
import type { Program, Workout } from '../../domain/training/types';
import { db as defaultDb, type VyroDatabase } from '../db';
import { StorageError, guard } from '../errors';

function assertProgramValid(program: Program) {
  for (const template of program.templates) {
    for (const slot of template.slots) {
      if (Object.keys(validateSlot(slot)).length > 0) throw new RangeError('Paramètres d’exercice invalides.');
    }
  }
}

export function createTrainingRepository(db: VyroDatabase) {
  return {
    async getActiveProgram(): Promise<Program | null> {
      const programs = await guard(() => db.programs.toArray());
      const active = programs.filter((program) => program.active);
      if (active.some((program) => !isStoredProgram(program))) throw new StorageError('integrity', { detail: 'programme' });
      return active.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
    },

    /** Active un nouveau programme. Les anciens sont conservés (historique), désactivés. */
    async activateNewProgram(program: Program): Promise<void> {
      assertProgramValid(program);
      await guard(() =>
        db.transaction('rw', db.programs, async () => {
          await db.programs.toCollection().modify({ active: false });
          await db.programs.add({ ...program, active: true });
        }),
      );
    },

    async updateProgram(program: Program): Promise<void> {
      assertProgramValid(program);
      await guard(() =>
        db.transaction('rw', db.programs, async () => {
          if (!(await db.programs.get(program.id))) throw new StorageError('integrity', { detail: 'programme introuvable' });
          await db.programs.put(program);
        }),
      );
    },

    /** Toutes les séances, de la plus récente à la plus ancienne. */
    async listWorkouts(): Promise<Workout[]> {
      const workouts = await guard(() => db.workouts.toArray());
      const invalid = workouts.filter((workout) => !isStoredWorkout(workout));
      if (invalid.length > 0) throw new StorageError('integrity', { detail: `${invalid.length} séance(s)` });
      return workouts.sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt));
    },

    async getWorkout(id: string): Promise<Workout | null> {
      const record = await guard(() => db.workouts.get(id));
      if (record === undefined) return null;
      if (!isStoredWorkout(record)) throw new StorageError('integrity', { detail: 'séance' });
      return record;
    },

    /**
     * Démarre une séance. S'il y en a déjà une en cours, elle est renvoyée à la place :
     * on ne crée jamais deux séances en parallèle.
     */
    async startWorkout(workout: Workout): Promise<Workout> {
      return guard(() =>
        db.transaction('rw', db.workouts, async () => {
          const running = await db.workouts.where('status').equals('in-progress').first();
          if (running) return running;
          await db.workouts.add(workout);
          return workout;
        }),
      );
    },

    /** Enregistre l'état d'une séance (appelé à chaque saisie : rien n'est perdu si l'app se ferme). */
    async saveWorkout(workout: Workout): Promise<void> {
      await guard(() => db.workouts.put(workout));
    },

    async deleteWorkout(id: string): Promise<void> {
      await guard(() => db.workouts.delete(id));
    },
  };
}

export type TrainingRepository = ReturnType<typeof createTrainingRepository>;
export const trainingRepository = createTrainingRepository(defaultDb);
