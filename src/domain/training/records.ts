import type { IsoDate } from '../common/dates';
import type { Workout } from './types';

/**
 * Records personnels calculés uniquement à partir des séries réellement enregistrées.
 * Aucune estimation de charge maximale (1RM) n'est calculée ni affichée.
 */
export interface ExerciseRecords {
  exerciseId: string;
  /** Charge la plus lourde soulevée (au moins 1 répétition), avec le nombre de répétitions. */
  heaviest: { loadKg: number; reps: number; date: IsoDate; workoutId: string } | null;
  /** Plus grand nombre de répétitions en une série. */
  mostReps: { reps: number; loadKg: number | null; date: IsoDate; workoutId: string } | null;
  /** Meilleur tonnage d'une séance pour cet exercice (charge × répétitions). */
  bestVolume: { volumeKg: number; date: IsoDate; workoutId: string } | null;
}

export type RecordKind = 'heaviest' | 'mostReps' | 'bestVolume';

export interface NewRecord {
  exerciseId: string;
  kind: RecordKind;
  description: string;
}

function completed(workouts: readonly Workout[]) {
  return workouts
    .filter((workout) => workout.status === 'completed')
    .sort((a, b) => a.date.localeCompare(b.date) || a.startedAt.localeCompare(b.startedAt));
}

export function computeRecords(workouts: readonly Workout[]): Map<string, ExerciseRecords> {
  const records = new Map<string, ExerciseRecords>();
  for (const workout of completed(workouts)) {
    for (const exercise of workout.exercises) {
      const sets = exercise.sets.filter((set) => set.done && set.reps !== null && set.reps > 0);
      if (sets.length === 0) continue;
      const current = records.get(exercise.exerciseId) ?? {
        exerciseId: exercise.exerciseId,
        heaviest: null,
        mostReps: null,
        bestVolume: null,
      };
      let volume = 0;
      for (const set of sets) {
        const reps = set.reps as number;
        const load = set.loadKg;
        if (load !== null && load > 0) {
          volume += load * reps;
          const heavier = !current.heaviest || load > current.heaviest.loadKg;
          const sameLoadMoreReps = current.heaviest && load === current.heaviest.loadKg && reps > current.heaviest.reps;
          if (heavier || sameLoadMoreReps) current.heaviest = { loadKg: load, reps, date: workout.date, workoutId: workout.id };
        }
        if (!current.mostReps || reps > current.mostReps.reps) {
          current.mostReps = { reps, loadKg: load, date: workout.date, workoutId: workout.id };
        }
      }
      if (volume > 0 && (!current.bestVolume || volume > current.bestVolume.volumeKg)) {
        current.bestVolume = { volumeKg: volume, date: workout.date, workoutId: workout.id };
      }
      records.set(exercise.exerciseId, current);
    }
  }
  return records;
}

/** Records battus par une séance, comparés à toutes les séances précédentes. */
export function newRecordsIn(workout: Workout, previous: readonly Workout[]): NewRecord[] {
  const before = computeRecords(previous.filter((item) => item.id !== workout.id));
  const after = computeRecords([...previous.filter((item) => item.id !== workout.id), { ...workout, status: 'completed' }]);
  const found: NewRecord[] = [];
  for (const [exerciseId, record] of after) {
    const old = before.get(exerciseId);
    if (!old) continue; // Première réalisation : c'est une référence, pas un record battu.
    if (record.heaviest?.workoutId === workout.id) {
      found.push({ exerciseId, kind: 'heaviest', description: `${record.heaviest.loadKg} kg × ${record.heaviest.reps}` });
    }
    if (record.mostReps?.workoutId === workout.id && record.mostReps.reps > (old.mostReps?.reps ?? 0)) {
      found.push({ exerciseId, kind: 'mostReps', description: `${record.mostReps.reps} répétitions` });
    }
    if (record.bestVolume?.workoutId === workout.id && record.bestVolume.volumeKg > (old.bestVolume?.volumeKg ?? 0)) {
      found.push({ exerciseId, kind: 'bestVolume', description: `${Math.round(record.bestVolume.volumeKg)} kg soulevés` });
    }
  }
  return found;
}
