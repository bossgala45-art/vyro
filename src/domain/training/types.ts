import type { IsoDate } from '../common/dates';
import type { Equipment } from '../profile/types';

/** Jour de la semaine : 0 = lundi … 6 = dimanche. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'horizontal-push'
  | 'vertical-push'
  | 'horizontal-pull'
  | 'vertical-pull'
  | 'lateral-raise'
  | 'biceps'
  | 'triceps'
  | 'core';

export type Muscle =
  | 'quadriceps'
  | 'ischios'
  | 'fessiers'
  | 'mollets'
  | 'pectoraux'
  | 'dorsaux'
  | 'trapèzes'
  | 'épaules'
  | 'biceps'
  | 'triceps'
  | 'abdominaux'
  | 'lombaires';

/** Sollicitation des jambes : sert à éloigner les séances lourdes des matchs. */
export type LegDemand = 'none' | 'low' | 'moderate' | 'high';

export type LoadType = 'external' | 'bodyweight';

export interface Exercise {
  /** Identifiant stable : ne jamais le modifier (référencé par l'historique). */
  id: string;
  name: string;
  pattern: MovementPattern;
  primaryMuscles: readonly Muscle[];
  secondaryMuscles: readonly Muscle[];
  /** Tout ce matériel est nécessaire. Liste vide : poids du corps. */
  equipment: readonly Equipment[];
  loadType: LoadType;
  /** Charge indiquée par haltère (et non au total). */
  loadPerHand?: boolean;
  /** Plus petite augmentation de charge réaliste, en kg. */
  loadIncrementKg: number;
  legDemand: LegDemand;
  level: 'beginner' | 'intermediate';
  /** Développé couché à la barre libre (exclu si l'utilisateur l'a demandé). */
  freeBarbellBench?: boolean;
  technique: readonly string[];
  safety: readonly string[];
}

export type TemplateKey = 'A' | 'B' | 'C';

/** Un exercice prévu dans une séance type. Tous les champs sont modifiables. */
export interface ExerciseSlot {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  /** Répétitions gardées en réserve visées (jamais l'échec). */
  targetRir: number;
  /** Charge de départ choisie par l'utilisateur ; `null` = à déterminer en séance. */
  startLoadKg: number | null;
  role: 'main' | 'accessory';
}

export interface SessionTemplate {
  key: TemplateKey;
  name: string;
  focus: string;
  /** Séance facultative (troisième séance selon la récupération). */
  optional: boolean;
  slots: ExerciseSlot[];
}

export interface Program {
  id: string;
  createdAt: string;
  active: boolean;
  templates: SessionTemplate[];
  /** Explications des choix du générateur. */
  rationale: string[];
}

/** Semaine type déclarée par l'utilisateur (remplacée par le calendrier à l'étape 4). */
export interface WeeklyRoutine {
  id: 'me';
  /** Jours où la salle est possible. Vide = disponibilités inconnues : rien n'est planifié. */
  gymDays: Weekday[];
  practiceDays: Weekday[];
  matchDays: Weekday[];
  /** Proposer une troisième séance facultative. */
  includeOptionalThird: boolean;
  updatedAt: string;
}

export interface LoggedSet {
  reps: number | null;
  loadKg: number | null;
  /** Répétitions en réserve déclarées ; `null` = non renseigné. */
  rir: number | null;
  done: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  slot: ExerciseSlot;
  /** Objectif calculé pour cette séance (modifiable). */
  target: { repMin: number; repMax: number; loadKg: number | null; sets: number };
  /** Explication de l'objectif (progression, maintien, douleur…). */
  targetNote: string;
  sets: LoggedSet[];
  pain: { reported: boolean; note: string };
  skipped: boolean;
}

export type WorkoutStatus = 'in-progress' | 'completed' | 'abandoned';

export interface Workout {
  id: string;
  programId: string;
  templateKey: TemplateKey;
  date: IsoDate;
  status: WorkoutStatus;
  /** Séance allégée (fatigue) : volume réduit, aucune progression déduite. */
  light: boolean;
  startedAt: string;
  finishedAt: string | null;
  exercises: WorkoutExercise[];
  /** Difficulté ressentie de la séance, 1 à 10. */
  sessionRpe: number | null;
  notes: string;
}
