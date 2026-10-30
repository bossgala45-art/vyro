import type { IsoDate } from '../common/dates';

export const BODY_ZONES = [
  'shoulders',
  'chest',
  'upperBack',
  'lowBack',
  'arms',
  'elbows',
  'wrists',
  'hips',
  'quads',
  'hamstrings',
  'knees',
  'calves',
  'ankles',
  'other',
] as const;
export type BodyZone = (typeof BODY_ZONES)[number];

export const SORENESS_LEVELS = ['none', 'light', 'moderate', 'strong'] as const;
export type SorenessLevel = (typeof SORENESS_LEVELS)[number];

/**
 * Check-in de récupération, un par jour (le dernier remplace le précédent).
 * `null` = question non répondue : rien n'est supposé à la place de l'utilisateur.
 */
export interface CheckIn {
  date: IsoDate;
  sleepHours: number | null;
  /** 1 à 10. */
  energy: number | null;
  /** 1 à 10. */
  motivation: number | null;
  soreness: SorenessLevel | null;
  /** Douleur inhabituelle (différente de simples courbatures). `null` = non répondu. */
  pain: boolean | null;
  painZones: BodyZone[];
  /** 1 à 10, si douleur. */
  painIntensity: number | null;
  /** Temps disponible aujourd'hui pour la séance (minutes). */
  availableMinutes: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Repères utilisés par le moteur. Ce sont des repères prudents et réglables,
 * PAS des seuils médicaux validés.
 */
export interface RecoveryThresholds {
  /** Nuit courte : en dessous, séance adaptée. */
  shortSleepHours: number;
  /** Nuit très courte : en dessous, activité légère seulement. */
  veryShortSleepHours: number;
  /** Énergie basse (1–10) : à ce niveau ou en dessous, séance adaptée. */
  lowEnergy: number;
  /** Énergie très basse : à ce niveau ou en dessous, activité légère seulement. */
  veryLowEnergy: number;
  /** Motivation basse : simple remarque (elle ne réduit pas la séance à elle seule). */
  lowMotivation: number;
  /** Douleur (1–10) à partir de laquelle le repos est conseillé. */
  painRestIntensity: number;
  /** Nombre de séances de basket (entraînements + matchs) sur 3 jours jugé élevé. */
  basketSessions3Days: number;
  /** Intensité de match (1–10) jugée élevée. */
  intenseMatch: number;
  /** Difficulté de la dernière séance de musculation (1–10) jugée très élevée. */
  hardWorkoutRpe: number;
  /** Temps minimal pour une séance de musculation ; en dessous, activité légère. */
  minSessionMinutes: number;
  /** Nombre de signaux de fatigue cumulés qui font passer à l'activité légère. */
  factorsForLightActivity: number;
}

export const DEFAULT_THRESHOLDS: RecoveryThresholds = {
  shortSleepHours: 6.5,
  veryShortSleepHours: 5,
  lowEnergy: 4,
  veryLowEnergy: 2,
  lowMotivation: 3,
  painRestIntensity: 6,
  basketSessions3Days: 3,
  intenseMatch: 8,
  hardWorkoutRpe: 9,
  minSessionMinutes: 30,
  factorsForLightActivity: 3,
};

export type ReadinessLevel = 'normal' | 'adapted' | 'light' | 'rest' | 'need-info';

export interface ReadinessReason {
  /** Ce qui a été observé (« Nuit de 5 h 30 »). */
  observation: string;
  /** Conséquence sur la décision (« séance adaptée »). */
  effect: string;
  level: ReadinessLevel;
}

export interface ReadinessDecision {
  level: ReadinessLevel;
  reasons: ReadinessReason[];
  /** Questions à compléter quand les données sont insuffisantes. */
  missing: string[];
  /** Zones douloureuses : les exercices qui les sollicitent sont retirés. */
  excludedZones: BodyZone[];
  /** Conseils concrets associés à la décision. */
  advice: string[];
}
