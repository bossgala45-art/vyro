import type { PlanChange } from '../calendar/diff';
import type { ActivityKind, ActivityLog, LocalTime, PlannedGymSession } from '../calendar/types';
import type { IsoDate } from '../common/dates';
import type { DrinkEntry } from '../nutrition/types';
import type { GoalType } from '../profile/types';
import type { Point } from '../progress/series';
import type { MeasurementEntry } from '../progress/types';
import type { CheckIn, ReadinessLevel, ReadinessReason, RecoveryThresholds } from '../recovery/types';
import type { Program, TemplateKey, Workout } from '../training/types';

/** Note du journal de motivation (écrite par l'utilisateur, jamais générée). */
export interface MotivationEntry {
  id: string;
  date: IsoDate;
  /** Motivation ressentie 1–10, `null` si non renseignée. */
  motivation: number | null;
  text: string;
  createdAt: string;
}

/** État du coach conservé dans les réglages. */
export interface CoachState {
  /** Fin du dernier bilan de 14 jours consulté. */
  reviewSeenUntil: IsoDate | null;
  /** Messages masqués par l'utilisateur (identifiant stable + date). */
  dismissed: { id: string; date: IsoDate }[];
}

export const DEFAULT_COACH_STATE: CoachState = { reviewSeenUntil: null, dismissed: [] };

/**
 * Toutes les données réelles dont le coach dispose. Il ne lit rien d'autre :
 * une information absente ici est une information qu'il ne connaît pas.
 */
export interface CoachContext {
  today: IsoDate;
  firstName: string | null;
  goal: { type: GoalType; targetDate: IsoDate } | null;
  /** Date de création du profil : point de départ des bilans de 14 jours. */
  startDate: IsoDate | null;
  program: Program | null;
  workouts: readonly Workout[];
  /** Planning de musculation de la semaine en cours (`null` sans programme). */
  week: { sessions: readonly PlannedGymSession[]; explanations: readonly string[]; excludedDays: readonly { date: IsoDate; reason: string }[] } | null;
  /** Changements du planning depuis la dernière consultation du calendrier. */
  planChanges: readonly PlanChange[];
  day: {
    isMatchDay: boolean;
    matchTomorrow: boolean;
    matchYesterday: { intensity: number | null } | null;
    vacation: boolean;
    activities: readonly { kind: ActivityKind; title: string; startTime: LocalTime | null }[];
  };
  readiness: {
    level: ReadinessLevel;
    reasons: readonly ReadinessReason[];
    advice: readonly string[];
    missing: readonly string[];
    hasCheckIn: boolean;
    /** Séance envisagée aujourd'hui. */
    template: { key: TemplateKey; name: string } | null;
    plannedToday: boolean;
  };
  thresholds: RecoveryThresholds;
  checkIns: readonly CheckIn[];
  weights: readonly Point[];
  measurements: readonly MeasurementEntry[];
  photoDates: readonly IsoDate[];
  drinks: readonly DrinkEntry[];
  /** Repère d'hydratation de base (sans le supplément sport), en ml. */
  hydrationBaseMl: number;
  activityLogs: readonly ActivityLog[];
  motivation: readonly MotivationEntry[];
  /** Dernier export chiffré (ISO), `null` si jamais fait. */
  lastBackupAt: string | null;
  state: CoachState;
}

export type MessageKind = 'safety' | 'recovery' | 'session' | 'celebration' | 'planning' | 'review' | 'regularity' | 'motivation' | 'tracking';

/** Message proactif : chaque message dit sur quelles données il s'appuie. */
export interface CoachMessage {
  /** Identifiant stable (permet de masquer le message). */
  id: string;
  kind: MessageKind;
  /** Plus petit = plus important. */
  priority: number;
  /** Incite à s'entraîner : jamais affiché si la récupération conseille repos ou activité légère. */
  push: boolean;
  title: string;
  text: string;
  basedOn: string;
  action: { label: string; to: string } | null;
}

export interface CoachAnswer {
  title: string;
  lines: string[];
  /** Données utilisées pour répondre (transparence). */
  basedOn: string[];
  links: { label: string; to: string }[];
}
