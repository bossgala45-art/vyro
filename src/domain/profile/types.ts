import type { IsoDate } from '../common/dates';

export const SEXES = ['male', 'female', 'unspecified'] as const;
export type Sex = (typeof SEXES)[number];

export const EXPERIENCE_LEVELS = ['none', 'lt3m', '3to6m', '6to12m', '1to2y', 'gt2y'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const GOAL_TYPES = ['athletic', 'muscle', 'strength', 'basketball', 'fitness'] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const EQUIPMENT = [
  'dumbbells',
  'bench',
  'barbell',
  'plates',
  'cables',
  'machines',
  'pullupBar',
  'kettlebells',
  'bands',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export interface TrainingPreferences {
  equipment: Equipment[];
  /** Durée de séance souhaitée, en minutes. */
  sessionMinutes: { min: number; max: number };
  likedExercises: string[];
  avoidedExercises: string[];
  /** Exclure le développé couché libre à la barre sans pareur ni sécurité. */
  noUnassistedFreeBench: boolean;
}

export interface FoodPreferences {
  liked: string[];
  tolerated: string[];
  refused: string[];
}

export interface Profile {
  id: 'me';
  firstName: string | null;
  birthYear: number;
  sex: Sex;
  heightCm: number;
  experience: ExperienceLevel;
  goal: { type: GoalType; targetDate: IsoDate; notes: string };
  training: TrainingPreferences;
  foods: FoodPreferences;
  /** Horodatages ISO 8601. */
  createdAt: string;
  updatedAt: string;
}

/** Pesée datée : le poids évolue, il est donc enregistré comme un historique. */
export interface BodyWeightEntry {
  id?: number;
  date: IsoDate;
  kg: number;
  createdAt: string;
}
