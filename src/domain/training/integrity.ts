import type { ExerciseSlot, Program, Weekday, WeeklyRoutine, Workout } from './types';

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isWeekdayList = (value: unknown): value is Weekday[] =>
  Array.isArray(value) && value.every((day) => Number.isInteger(day) && day >= 0 && day <= 6);

export const SLOT_LIMITS = {
  sets: { min: 1, max: 10 },
  reps: { min: 1, max: 50 },
  restSeconds: { min: 15, max: 600 },
  rir: { min: 0, max: 5 },
  loadKg: { min: 0.5, max: 500 },
} as const;

/** Erreurs de saisie d'un exercice du programme (modification manuelle). */
export function validateSlot(slot: ExerciseSlot): Partial<Record<keyof ExerciseSlot, string>> {
  const errors: Partial<Record<keyof ExerciseSlot, string>> = {};
  const inRange = (value: number, { min, max }: { min: number; max: number }) =>
    Number.isFinite(value) && value >= min && value <= max;
  if (!Number.isInteger(slot.sets) || !inRange(slot.sets, SLOT_LIMITS.sets)) errors.sets = 'Entre 1 et 10 séries.';
  if (!Number.isInteger(slot.repMin) || !inRange(slot.repMin, SLOT_LIMITS.reps)) errors.repMin = 'Entre 1 et 50.';
  if (!Number.isInteger(slot.repMax) || !inRange(slot.repMax, SLOT_LIMITS.reps)) errors.repMax = 'Entre 1 et 50.';
  else if (slot.repMax < slot.repMin) errors.repMax = 'Doit être supérieur ou égal au minimum.';
  if (!Number.isInteger(slot.restSeconds) || !inRange(slot.restSeconds, SLOT_LIMITS.restSeconds)) {
    errors.restSeconds = 'Entre 15 et 600 secondes.';
  }
  if (!Number.isInteger(slot.targetRir) || !inRange(slot.targetRir, SLOT_LIMITS.rir)) errors.targetRir = 'Entre 0 et 5.';
  if (slot.startLoadKg !== null && !inRange(slot.startLoadKg, SLOT_LIMITS.loadKg)) {
    errors.startLoadKg = 'Charge entre 0,5 et 500 kg, ou laisse vide.';
  }
  return errors;
}

export function isStoredRoutine(value: unknown): value is WeeklyRoutine {
  return (
    isObject(value) &&
    value.id === 'me' &&
    isWeekdayList(value.gymDays) &&
    isWeekdayList(value.practiceDays) &&
    isWeekdayList(value.matchDays) &&
    typeof value.includeOptionalThird === 'boolean'
  );
}

function isSlot(value: unknown): value is ExerciseSlot {
  return (
    isObject(value) &&
    typeof value.exerciseId === 'string' &&
    typeof value.sets === 'number' &&
    typeof value.repMin === 'number' &&
    typeof value.repMax === 'number' &&
    typeof value.restSeconds === 'number' &&
    typeof value.targetRir === 'number' &&
    (value.startLoadKg === null || typeof value.startLoadKg === 'number')
  );
}

export function isStoredProgram(value: unknown): value is Program {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.active === 'boolean' &&
    Array.isArray(value.templates) &&
    value.templates.every(
      (template) =>
        isObject(template) &&
        typeof template.key === 'string' &&
        typeof template.name === 'string' &&
        Array.isArray(template.slots) &&
        template.slots.every(isSlot),
    ) &&
    Array.isArray(value.rationale)
  );
}

export function isStoredWorkout(value: unknown): value is Workout {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.date === 'string' &&
    ['in-progress', 'completed', 'abandoned'].includes(value.status as string) &&
    typeof value.light === 'boolean' &&
    Array.isArray(value.exercises) &&
    value.exercises.every(
      (exercise) =>
        isObject(exercise) &&
        typeof exercise.exerciseId === 'string' &&
        Array.isArray(exercise.sets) &&
        isObject(exercise.target) &&
        isObject(exercise.pain),
    )
  );
}
