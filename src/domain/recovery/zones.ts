import { EXERCISES } from '../training/exercises';
import type { Exercise, MovementPattern, Muscle } from '../training/types';
import type { BodyZone } from './types';

export const ZONE_LABELS: Record<BodyZone, string> = {
  shoulders: 'Épaules',
  chest: 'Poitrine',
  upperBack: 'Haut du dos',
  lowBack: 'Bas du dos',
  arms: 'Bras',
  elbows: 'Coudes',
  wrists: 'Poignets',
  hips: 'Hanches / fessiers',
  quads: 'Cuisses (avant)',
  hamstrings: 'Cuisses (arrière)',
  knees: 'Genoux',
  calves: 'Mollets',
  ankles: 'Chevilles',
  other: 'Autre',
};

/**
 * Muscles et mouvements qui sollicitent chaque zone. Volontairement large :
 * en cas de doute, un exercice est retiré plutôt que maintenu.
 */
const ZONE_LOAD: Record<BodyZone, { muscles: Muscle[]; patterns: MovementPattern[] }> = {
  shoulders: { muscles: ['épaules'], patterns: ['vertical-push', 'lateral-raise', 'horizontal-push'] },
  chest: { muscles: ['pectoraux'], patterns: ['horizontal-push'] },
  upperBack: { muscles: ['dorsaux', 'trapèzes'], patterns: ['horizontal-pull', 'vertical-pull'] },
  lowBack: { muscles: ['lombaires'], patterns: ['hinge', 'squat'] },
  arms: { muscles: ['biceps', 'triceps'], patterns: ['biceps', 'triceps'] },
  elbows: { muscles: ['biceps', 'triceps'], patterns: ['biceps', 'triceps', 'horizontal-push', 'vertical-push', 'vertical-pull'] },
  wrists: { muscles: [], patterns: ['horizontal-push', 'vertical-push', 'biceps', 'triceps', 'horizontal-pull'] },
  hips: { muscles: ['fessiers'], patterns: ['hinge', 'squat', 'lunge'] },
  quads: { muscles: ['quadriceps'], patterns: ['squat', 'lunge'] },
  hamstrings: { muscles: ['ischios'], patterns: ['hinge'] },
  knees: { muscles: ['quadriceps'], patterns: ['squat', 'lunge'] },
  calves: { muscles: ['mollets'], patterns: ['lunge'] },
  ankles: { muscles: ['mollets'], patterns: ['squat', 'lunge'] },
  other: { muscles: [], patterns: [] },
};

export function exerciseLoadsZone(exercise: Exercise, zone: BodyZone): boolean {
  const load = ZONE_LOAD[zone];
  const muscles = [...exercise.primaryMuscles, ...exercise.secondaryMuscles];
  return load.patterns.includes(exercise.pattern) || muscles.some((muscle) => load.muscles.includes(muscle));
}

/** Exercices qui sollicitent au moins une des zones douloureuses. */
export function exercisesAffectedBy(zones: readonly BodyZone[]): string[] {
  if (zones.length === 0) return [];
  return EXERCISES.filter((exercise) => zones.some((zone) => exerciseLoadsZone(exercise, zone))).map((exercise) => exercise.id);
}

/** Les jambes sont-elles concernées (importance pour le basket) ? */
export function isLowerBody(zone: BodyZone): boolean {
  return ['hips', 'quads', 'hamstrings', 'knees', 'calves', 'ankles', 'lowBack'].includes(zone);
}
