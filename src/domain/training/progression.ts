import { daysBetween, type IsoDate } from '../common/dates';
import type { Exercise, ExerciseSlot, LoggedSet } from './types';

/**
 * Progression « double » prudente, entièrement explicable :
 * 1. on augmente d'abord les répétitions dans la fourchette ;
 * 2. la charge n'augmente (du plus petit incrément) que si TOUTES les séries ont atteint
 *    le haut de la fourchette, avec des répétitions en réserve déclarées et sans douleur ;
 * 3. aucune hausse après une douleur, une séance allégée, une série à l'échec, une séance
 *    jugée très dure, ou si les répétitions en réserve ne sont pas renseignées ;
 * 4. après une longue interruption, la charge est réduite pour reprendre en sécurité ;
 * 5. aucune charge n'est inventée : sans charge connue, elle reste « à déterminer ».
 */

/** Une réalisation passée d'un exercice. */
export interface Exposure {
  date: IsoDate;
  light: boolean;
  pain: boolean;
  sessionRpe: number | null;
  repMin: number;
  repMax: number;
  plannedSets: number;
  /** Séries effectivement réalisées. */
  sets: LoggedSet[];
}

export type Decision =
  | 'calibrate'
  | 'start'
  | 'increase-load'
  | 'add-reps'
  | 'hold'
  | 'reduce'
  | 'reentry'
  | 'pain';

export interface Target {
  sets: number;
  repMin: number;
  repMax: number;
  loadKg: number | null;
  decision: Decision;
  note: string;
}

export const PROGRESSION_RULES = {
  /** Interruption (jours) à partir de laquelle la charge est réduite de 10 %. */
  reentryDays: 14,
  /** Interruption (jours) à partir de laquelle elle est réduite de 20 %. */
  longReentryDays: 28,
  /** Réduction après une douleur signalée. */
  painReduction: 0.1,
  /** Réduction après deux séances de suite sous la fourchette. */
  stallReduction: 0.05,
  /** Difficulté de séance (1–10) à partir de laquelle on n'augmente pas la charge. */
  hardSessionRpe: 9,
} as const;

function roundDown(value: number, increment: number): number {
  if (increment <= 0) return Math.round(value * 10) / 10;
  return Math.max(increment, Math.floor(value / increment + 1e-9) * increment);
}

function format(kg: number): string {
  return `${kg.toLocaleString('fr-FR')} kg`;
}

/** Charge de travail d'une réalisation : la plus fréquente parmi les séries faites (la plus lourde en cas d'égalité). */
export function workingLoad(sets: readonly LoggedSet[]): number | null {
  const loads = sets.filter((set) => set.done && set.loadKg !== null && set.loadKg > 0).map((set) => set.loadKg as number);
  if (loads.length === 0) return null;
  const counts = new Map<number, number>();
  for (const load of loads) counts.set(load, (counts.get(load) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] ?? null;
}

function doneSets(exposure: Exposure) {
  return exposure.sets.filter((set) => set.done && set.reps !== null);
}

/**
 * Objectif de la prochaine séance pour un exercice.
 * @param history réalisations passées, de la plus récente à la plus ancienne.
 */
export function computeTarget(slot: ExerciseSlot, exercise: Exercise, history: readonly Exposure[], today: IsoDate): Target {
  const base = { sets: slot.sets, repMin: slot.repMin, repMax: slot.repMax };
  const external = exercise.loadType === 'external';
  const calibrate = (why: string): Target => ({
    ...base,
    loadKg: null,
    decision: 'calibrate',
    note: `${why} Choisis une charge que tu peux soulever ${slot.repMax} fois en gardant environ 3 répétitions en réserve, sans douleur. Note-la : elle servira de référence.`,
  });

  const last = history.find((exposure) => doneSets(exposure).length > 0);
  if (!last) {
    if (!external) {
      return { ...base, loadKg: null, decision: 'start', note: `Poids du corps : vise ${slot.repMin} à ${slot.repMax} répétitions propres.` };
    }
    if (slot.startLoadKg !== null) {
      return { ...base, loadKg: slot.startLoadKg, decision: 'start', note: `Charge de départ que tu as choisie : ${format(slot.startLoadKg)}.` };
    }
    return calibrate('Première fois : charge à déterminer.');
  }

  const lastLoad = workingLoad(last.sets);
  if (external && lastLoad === null) return calibrate('Aucune charge enregistrée la dernière fois.');

  // 1. Douleur : jamais de hausse, réduction prudente.
  if (last.pain) {
    const reduced = external && lastLoad !== null ? roundDown(lastLoad * (1 - PROGRESSION_RULES.painReduction), exercise.loadIncrementKg) : null;
    return {
      ...base,
      loadKg: reduced,
      decision: 'pain',
      note:
        'Douleur signalée la dernière fois : charge réduite et aucune hausse. Arrête l’exercice si la douleur revient ; si elle persiste, demande l’avis d’un professionnel de santé.',
    };
  }

  // 2. Reprise après une interruption.
  const gap = daysBetween(last.date, today);
  if (gap >= PROGRESSION_RULES.reentryDays) {
    const factor = gap >= PROGRESSION_RULES.longReentryDays ? 0.8 : 0.9;
    return {
      ...base,
      loadKg: external && lastLoad !== null ? roundDown(lastLoad * factor, exercise.loadIncrementKg) : null,
      decision: 'reentry',
      note: `Reprise après ${gap} jours sans cet exercice : charge réduite de ${Math.round((1 - factor) * 100)} % pour repartir en sécurité.`,
    };
  }

  const hold = (note: string): Target => ({ ...base, loadKg: lastLoad, decision: 'hold', note });

  if (last.light) return hold('Dernière séance allégée : même objectif, sans progression.');

  const sets = doneSets(last);
  if (sets.length < last.plannedSets) return hold('Séance incomplète la dernière fois : on garde le même objectif.');

  const reps = sets.map((set) => set.reps as number);
  const allTop = reps.every((value) => value >= last.repMax);
  const allInRange = reps.every((value) => value >= last.repMin);
  const reachedFailure = sets.some((set) => set.rir === 0);
  const rirKnown = sets.every((set) => set.rir !== null);
  const veryHard = last.sessionRpe !== null && last.sessionRpe >= PROGRESSION_RULES.hardSessionRpe;

  if (!allInRange) {
    const previous = history.slice(history.indexOf(last) + 1).find((exposure) => doneSets(exposure).length > 0);
    const previousStalled =
      previous !== undefined &&
      !previous.light &&
      workingLoad(previous.sets) === lastLoad &&
      doneSets(previous).some((set) => (set.reps as number) < previous.repMin);
    if (previousStalled && external && lastLoad !== null) {
      return {
        ...base,
        loadKg: roundDown(lastLoad * (1 - PROGRESSION_RULES.stallReduction), exercise.loadIncrementKg),
        decision: 'reduce',
        note: 'Deux séances de suite sous la fourchette de répétitions : charge légèrement réduite pour retrouver de la marge.',
      };
    }
    return hold('Fourchette de répétitions pas encore atteinte : même charge, vise une répétition de plus.');
  }

  if (reachedFailure) return hold('Une série est allée jusqu’à l’échec : même charge, garde au moins 1 à 2 répétitions en réserve.');

  if (allTop) {
    if (!external) {
      return {
        ...base,
        loadKg: null,
        decision: 'add-reps',
        note: 'Haut de la fourchette atteint au poids du corps : passe à une variante plus difficile ou ajoute une charge légère quand tu te sens prêt.',
      };
    }
    if (!rirKnown) return hold('Haut de fourchette atteint, mais répétitions en réserve non renseignées : indique-les pour permettre une hausse de charge.');
    if (veryHard) return hold('Séance jugée très difficile : on consolide avant d’augmenter.');
    const next = (lastLoad as number) + exercise.loadIncrementKg;
    return {
      ...base,
      loadKg: next,
      decision: 'increase-load',
      note: `Toutes les séries au haut de la fourchette avec de la marge : +${format(exercise.loadIncrementKg)} (${format(next)}), retour à ${slot.repMin} répétitions.`,
    };
  }

  return {
    ...base,
    loadKg: lastLoad,
    decision: 'add-reps',
    note: 'Dans la fourchette : même charge, vise une répétition de plus sur une ou plusieurs séries.',
  };
}

/** Une séance allégée ne fait jamais monter la charge et retire une série. */
export function lightenTarget(target: Target, previousLoad: number | null): Target {
  const loadKg = target.decision === 'increase-load' ? previousLoad : target.loadKg;
  return {
    ...target,
    sets: Math.max(1, target.sets - 1),
    loadKg,
    decision: target.decision === 'increase-load' ? 'hold' : target.decision,
    note: `Séance allégée : une série de moins, pas de hausse de charge. ${target.decision === 'increase-load' ? '' : target.note}`.trim(),
  };
}
