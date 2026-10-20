import type { IsoDate } from '../common/dates';
import { getExercise } from './exercises';
import { computeTarget, lightenTarget, workingLoad, type Exposure } from './progression';
import type { LoggedSet, Program, TemplateKey, Workout, WorkoutExercise } from './types';

/** Réalisations passées d'un exercice, de la plus récente à la plus ancienne (séances terminées). */
export function exposuresFor(exerciseId: string, workouts: readonly Workout[]): Exposure[] {
  return workouts
    .filter((workout) => workout.status === 'completed')
    .sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt))
    .flatMap((workout) =>
      workout.exercises
        .filter((exercise) => exercise.exerciseId === exerciseId && !exercise.skipped)
        .map((exercise) => ({
          date: workout.date,
          light: workout.light,
          pain: exercise.pain.reported,
          sessionRpe: workout.sessionRpe,
          repMin: exercise.target.repMin,
          repMax: exercise.target.repMax,
          plannedSets: exercise.target.sets,
          sets: exercise.sets,
        })),
    );
}

function emptySets(count: number, loadKg: number | null): LoggedSet[] {
  return Array.from({ length: count }, () => ({ reps: null, loadKg, rir: null, done: false }));
}

interface CreateWorkoutInput {
  id: string;
  program: Program;
  templateKey: TemplateKey;
  date: IsoDate;
  now: string;
  light: boolean;
  history: readonly Workout[];
}

/** Prépare une séance à partir du programme et de l'historique (objectifs expliqués). */
export function createWorkout({ id, program, templateKey, date, now, light, history }: CreateWorkoutInput): Workout {
  const template = program.templates.find((item) => item.key === templateKey);
  if (!template) throw new Error(`Séance ${templateKey} absente du programme`);

  const exercises: WorkoutExercise[] = template.slots.flatMap((slot) => {
    const exercise = getExercise(slot.exerciseId);
    if (!exercise) return [];
    const exposures = exposuresFor(slot.exerciseId, history);
    let target = computeTarget(slot, exercise, exposures, date);
    if (light) target = lightenTarget(target, exposures[0] ? workingLoad(exposures[0].sets) : null);
    return [
      {
        exerciseId: slot.exerciseId,
        slot: { ...slot },
        target: { sets: target.sets, repMin: target.repMin, repMax: target.repMax, loadKg: target.loadKg },
        targetNote: target.note,
        sets: emptySets(target.sets, target.loadKg),
        pain: { reported: false, note: '' },
        skipped: false,
      },
    ];
  });

  return {
    id,
    programId: program.id,
    templateKey,
    date,
    status: 'in-progress',
    light,
    startedAt: now,
    finishedAt: null,
    exercises,
    sessionRpe: null,
    notes: '',
  };
}

export interface WorkoutSummary {
  setsDone: number;
  setsPlanned: number;
  volumeKg: number;
  durationMinutes: number | null;
  painExercises: string[];
}

export function summarizeWorkout(workout: Workout): WorkoutSummary {
  let setsDone = 0;
  let setsPlanned = 0;
  let volumeKg = 0;
  for (const exercise of workout.exercises) {
    if (exercise.skipped) continue;
    setsPlanned += exercise.sets.length;
    for (const set of exercise.sets) {
      if (!set.done) continue;
      setsDone += 1;
      if (set.reps !== null && set.loadKg !== null) volumeKg += set.reps * set.loadKg;
    }
  }
  const durationMinutes =
    workout.finishedAt !== null
      ? Math.max(1, Math.round((Date.parse(workout.finishedAt) - Date.parse(workout.startedAt)) / 60_000))
      : null;
  return {
    setsDone,
    setsPlanned,
    volumeKg: Math.round(volumeKg),
    durationMinutes,
    painExercises: workout.exercises.filter((exercise) => exercise.pain.reported).map((exercise) => exercise.exerciseId),
  };
}

/** Dernière séance principale terminée (pour la rotation A/B). */
export function lastCompletedCoreKey(program: Program, workouts: readonly Workout[]): TemplateKey | null {
  const coreKeys = new Set(program.templates.filter((template) => !template.optional).map((template) => template.key));
  const last = workouts
    .filter((workout) => workout.status === 'completed' && coreKeys.has(workout.templateKey))
    .sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt))[0];
  return last?.templateKey ?? null;
}

/** Une série est valide si elle a un nombre de répétitions, et une charge pour un exercice chargé. */
export function validateSet(set: LoggedSet, loadType: 'external' | 'bodyweight'): string | undefined {
  if (set.reps === null || !Number.isInteger(set.reps) || set.reps < 0 || set.reps > 100) {
    return 'Indique un nombre de répétitions (0 à 100).';
  }
  if (loadType === 'external' && (set.loadKg === null || set.loadKg <= 0 || set.loadKg > 500)) {
    return 'Indique la charge utilisée (en kg).';
  }
  if (set.rir !== null && (!Number.isInteger(set.rir) || set.rir < 0 || set.rir > 10)) {
    return 'Répétitions en réserve : entre 0 et 10.';
  }
  return undefined;
}
