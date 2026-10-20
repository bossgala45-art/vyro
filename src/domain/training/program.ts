import type { Profile } from '../profile/types';
import { EXERCISES, getExercise, ineligibilityReason, type EligibilityOptions } from './exercises';
import type { ExerciseSlot, Program, SessionTemplate, TemplateKey } from './types';

/**
 * Générateur de programme déterministe : mêmes entrées → même programme.
 *
 * Choix de conception (documentés et affichés à l'utilisateur) :
 * - 2 séances « corps complet » (A, B) + une 3e facultative centrée sur le haut du corps,
 *   car le basket sollicite déjà fortement les jambes ;
 * - volume de jambes modéré, pas d'exercice de jambes lourd en 3e séance ;
 * - aucune série jusqu'à l'échec : on vise 2 à 3 répétitions en réserve ;
 * - aucune charge maximale testée ni imposée.
 */

interface SlotBlueprint {
  /** Exercices candidats, par ordre de préférence. */
  candidates: readonly string[];
  role: 'main' | 'accessory';
  label: string;
}

interface TemplateBlueprint {
  key: TemplateKey;
  name: string;
  focus: string;
  optional: boolean;
  slots: readonly SlotBlueprint[];
}

const BLUEPRINTS: readonly TemplateBlueprint[] = [
  {
    key: 'A',
    name: 'Séance A — corps complet',
    focus: 'Quadriceps, pectoraux, dos (tirage vertical)',
    optional: false,
    slots: [
      { label: 'jambes (squat)', role: 'main', candidates: ['leg-press', 'goblet-squat', 'barbell-back-squat', 'db-split-squat', 'bodyweight-split-squat'] },
      { label: 'poussée horizontale', role: 'main', candidates: ['db-bench-press', 'machine-chest-press', 'smith-bench-press', 'barbell-bench-press', 'push-up'] },
      { label: 'tirage vertical', role: 'main', candidates: ['lat-pulldown', 'band-assisted-pull-up', 'pull-up'] },
      { label: 'tirage horizontal', role: 'accessory', candidates: ['seated-cable-row', 'machine-row', 'one-arm-db-row', 'barbell-row'] },
      { label: 'épaules', role: 'accessory', candidates: ['db-lateral-raise', 'cable-lateral-raise'] },
      { label: 'gainage', role: 'accessory', candidates: ['pallof-press', 'dead-bug', 'hanging-knee-raise'] },
    ],
  },
  {
    key: 'B',
    name: 'Séance B — corps complet',
    focus: 'Ischios et fessiers, épaules, dos (tirage horizontal)',
    optional: false,
    slots: [
      { label: 'charnière de hanche', role: 'main', candidates: ['db-romanian-deadlift', 'hip-thrust', 'barbell-romanian-deadlift', 'cable-pull-through', 'leg-curl'] },
      { label: 'poussée verticale', role: 'main', candidates: ['db-shoulder-press', 'machine-shoulder-press', 'push-up'] },
      { label: 'tirage horizontal', role: 'main', candidates: ['one-arm-db-row', 'machine-row', 'seated-cable-row', 'barbell-row'] },
      { label: 'poussée inclinée', role: 'accessory', candidates: ['incline-db-press', 'machine-chest-press', 'cable-fly', 'push-up'] },
      { label: 'unilatéral jambes', role: 'accessory', candidates: ['db-split-squat', 'db-reverse-lunge', 'bodyweight-split-squat'] },
      { label: 'biceps', role: 'accessory', candidates: ['db-curl', 'cable-curl', 'hammer-curl'] },
      { label: 'triceps', role: 'accessory', candidates: ['cable-triceps-pushdown', 'overhead-db-triceps-extension'] },
    ],
  },
  {
    key: 'C',
    name: 'Séance C — haut du corps (facultative)',
    focus: 'Pectoraux, dos, épaules, bras — sans jambes',
    optional: true,
    slots: [
      { label: 'poussée horizontale', role: 'main', candidates: ['machine-chest-press', 'smith-bench-press', 'db-bench-press', 'push-up'] },
      { label: 'tirage vertical', role: 'main', candidates: ['lat-pulldown', 'pull-up', 'band-assisted-pull-up'] },
      { label: 'tirage horizontal', role: 'accessory', candidates: ['seated-cable-row', 'machine-row', 'one-arm-db-row'] },
      { label: 'arrière d’épaules', role: 'accessory', candidates: ['face-pull'] },
      { label: 'épaules', role: 'accessory', candidates: ['cable-lateral-raise', 'db-lateral-raise'] },
      { label: 'biceps', role: 'accessory', candidates: ['hammer-curl', 'db-curl', 'cable-curl'] },
      { label: 'triceps', role: 'accessory', candidates: ['overhead-db-triceps-extension', 'cable-triceps-pushdown'] },
    ],
  },
];

/** Paramètres de volume selon l'expérience. */
function volumeFor(experience: Profile['experience']) {
  const beginner = experience === 'none' || experience === 'lt3m';
  const advanced = experience === '1to2y' || experience === 'gt2y';
  return {
    main: { sets: beginner ? 2 : advanced ? 4 : 3, repMin: 8, repMax: 10, rest: 120, rir: beginner ? 3 : 2 },
    accessory: { sets: beginner ? 2 : 3, repMin: 10, repMax: 15, rest: 75, rir: beginner ? 3 : 2 },
  };
}

/** Durée estimée d'une séance, en minutes (échauffement de 10 min compris). */
export function estimateMinutes(slots: readonly ExerciseSlot[]): number {
  const WARMUP = 10 * 60;
  const SET_WORK = 45;
  const TRANSITION = 60;
  const seconds = slots.reduce((total, slot) => total + slot.sets * (SET_WORK + slot.restSeconds) + TRANSITION, WARMUP);
  return Math.round(seconds / 60);
}

export interface GenerateOptions {
  id: string;
  now: string;
  profile: Pick<Profile, 'experience' | 'training'>;
}

export interface GenerationResult {
  program: Program;
  /** Mouvements impossibles à couvrir avec le matériel ou les préférences. */
  warnings: string[];
}

/** Préfère un exercice « aimé » parmi les candidats, sinon garde l'ordre prévu. */
function orderCandidates(candidates: readonly string[], liked: readonly string[]): string[] {
  const likedKeys = liked.map((tag) => tag.toLocaleLowerCase('fr'));
  const isLiked = (id: string) => {
    const name = getExercise(id)?.name.toLocaleLowerCase('fr') ?? '';
    return likedKeys.some((key) => key.length >= 4 && (name.includes(key) || key.includes(name)));
  };
  return [...candidates.filter(isLiked), ...candidates.filter((id) => !isLiked(id))];
}

export function generateProgram({ id, now, profile }: GenerateOptions): GenerationResult {
  const { training, experience } = profile;
  const eligibility: EligibilityOptions = {
    equipment: training.equipment,
    avoidedExercises: training.avoidedExercises,
    noUnassistedFreeBench: training.noUnassistedFreeBench,
    allowIntermediate: !['none', 'lt3m', '3to6m'].includes(experience),
  };
  const volume = volumeFor(experience);
  const warnings: string[] = [];
  const rationale: string[] = [
    '2 séances « corps complet » par semaine : assez pour progresser sans surcharger les jambes déjà sollicitées par le basket.',
    'Une 3e séance facultative, sans travail de jambes, uniquement si tu te sens bien récupéré.',
    `Objectif de ${volume.main.rir} à 3 répétitions en réserve : aucune série n’est menée jusqu’à l’échec et aucune charge maximale n’est testée.`,
  ];
  if (training.noUnassistedFreeBench) {
    rationale.push('Développé couché à la barre libre exclu, remplacé par des variantes sûres (haltères, machine, barre guidée).');
  }

  const templates: SessionTemplate[] = BLUEPRINTS.map((blueprint) => {
    const slots: ExerciseSlot[] = [];
    for (const slotBlueprint of blueprint.slots) {
      const used = new Set(slots.map((slot) => slot.exerciseId));
      const chosen = orderCandidates(slotBlueprint.candidates, training.likedExercises).find((candidateId) => {
        const exercise = getExercise(candidateId);
        return exercise && !used.has(candidateId) && ineligibilityReason(exercise, eligibility) === null;
      });
      if (!chosen) {
        warnings.push(`${blueprint.name} : aucun exercice disponible pour « ${slotBlueprint.label} » avec ton matériel et tes préférences.`);
        continue;
      }
      const params = volume[slotBlueprint.role];
      slots.push({
        exerciseId: chosen,
        sets: params.sets,
        repMin: params.repMin,
        repMax: params.repMax,
        restSeconds: params.rest,
        targetRir: params.rir,
        startLoadKg: null,
        role: slotBlueprint.role,
      });
    }

    // Respect de la durée maximale : on retire d'abord les exercices accessoires de fin.
    const maxMinutes = training.sessionMinutes.max;
    while (estimateMinutes(slots) > maxMinutes) {
      const lastAccessory = slots.map((slot) => slot.role).lastIndexOf('accessory');
      if (lastAccessory === -1) break;
      const [removed] = slots.splice(lastAccessory, 1);
      if (removed) {
        rationale.push(
          `${blueprint.name} : « ${getExercise(removed.exerciseId)?.name} » retiré pour tenir dans ${maxMinutes} minutes.`,
        );
      }
    }
    return { key: blueprint.key, name: blueprint.name, focus: blueprint.focus, optional: blueprint.optional, slots };
  });

  return { program: { id, createdAt: now, active: true, templates, rationale }, warnings };
}

/** Sollicitation des jambes la plus forte d'une séance type. */
export function templateLegDemand(template: SessionTemplate): 'none' | 'low' | 'moderate' | 'high' {
  const order = ['none', 'low', 'moderate', 'high'] as const;
  let max = 0;
  for (const slot of template.slots) {
    const demand = getExercise(slot.exerciseId)?.legDemand ?? 'none';
    max = Math.max(max, order.indexOf(demand));
  }
  return order[max] ?? 'none';
}

/** Tous les exercices utilisés par un programme (pour les vérifications et l'affichage). */
export function programExerciseIds(program: Program): string[] {
  return [...new Set(program.templates.flatMap((template) => template.slots.map((slot) => slot.exerciseId)))];
}

export const LIBRARY_SIZE = EXERCISES.length;
