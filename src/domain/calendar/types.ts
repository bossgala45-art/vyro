import type { IsoDate } from '../common/dates';
import type { TemplateKey, Weekday } from '../training/types';

/**
 * Heure locale « murale » HH:MM, sans fuseau : 18:00 reste 18:00 quel que soit le
 * changement d'heure. La conversion en instant précis n'est faite qu'à l'export ICS.
 */
export type LocalTime = string;

export type ActivityKind = 'practice' | 'match' | 'other';

export interface Recurrence {
  weekday: Weekday;
  /** Première date possible (incluse). */
  from: IsoDate;
  /** Dernière date possible (incluse) ; `null` = sans fin. */
  until: IsoDate | null;
}

/** Activité du calendrier : ponctuelle (date) ou récurrente chaque semaine (recurrence). */
export interface Activity {
  id: string;
  kind: ActivityKind;
  title: string;
  /** `null` : horaire non précisé (aucun horaire n'est inventé). */
  startTime: LocalTime | null;
  durationMinutes: number | null;
  /** Activité ponctuelle : sa date. `null` si récurrente. */
  date: IsoDate | null;
  recurrence: Recurrence | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/** Changement ponctuel d'une occurrence récurrente : annulée ou reportée. */
export interface OccurrenceException {
  id: string;
  activityId: string;
  /** Date d'origine de l'occurrence concernée. */
  date: IsoDate;
  action: 'cancel' | 'move';
  newDate: IsoDate | null;
  newStartTime: LocalTime | null;
  createdAt: string;
}

export interface Vacation {
  id: string;
  start: IsoDate;
  end: IsoDate;
  /** Entraînements et matchs habituels suspendus pendant les vacances. */
  basketballSuspended: boolean;
  /** Salle : aucune séance, ou disponibilités habituelles. */
  gym: 'none' | 'usual';
  /** Horodatage de la confirmation (les vacances ne s'activent qu'après confirmation). */
  confirmedAt: string;
}

/** Créneau habituel où la salle est possible. Heures `null` = journée sans horaire précis. */
export interface GymSlot {
  weekday: Weekday;
  from: LocalTime | null;
  to: LocalTime | null;
}

export interface PlanningSettings {
  id: 'me';
  gymSlots: GymSlot[];
  includeOptionalThird: boolean;
  updatedAt: string;
}

/** Réglages propres à une date : repos, salle indisponible, créneau différent, fatigue déclarée. */
export interface DayOverride {
  date: IsoDate;
  rest: boolean;
  gymUnavailable: boolean;
  gymWindow: { from: LocalTime; to: LocalTime } | null;
  fatigue: boolean;
  note: string;
  updatedAt: string;
}

/** Occurrence concrète d'une activité à une date. */
export interface Occurrence {
  /** Stable même si l'occurrence est reportée : `activité@date d'origine`. */
  id: string;
  activityId: string;
  kind: ActivityKind;
  title: string;
  date: IsoDate;
  startTime: LocalTime | null;
  durationMinutes: number | null;
  /** Occurrence reportée depuis cette date. */
  movedFrom: IsoDate | null;
  /** Suspendue par des vacances (affichée barrée, ignorée pour le planning). */
  suspended: boolean;
  recurring: boolean;
}

/** Suivi d'un match ou d'un entraînement réellement joué. */
export interface ActivityLog {
  /** Identifiant de l'occurrence. */
  id: string;
  activityId: string;
  kind: ActivityKind;
  date: IsoDate;
  played: boolean;
  /** Intensité ressentie de 1 à 10 ; `null` = non renseignée. */
  intensity: number | null;
  minutesPlayed: number | null;
  points: number | null;
  rebounds: number | null;
  assists: number | null;
  notes: string;
  updatedAt: string;
}

/** Séance de musculation placée par le moteur d'adaptation. */
export interface PlannedGymSession {
  date: IsoDate;
  templateKey: TemplateKey;
  optional: boolean;
  /** Heure de début proposée ; `null` si aucun horaire n'est connu. */
  startTime: LocalTime | null;
  /** Durée disponible si elle limite la séance. */
  availableMinutes: number | null;
  /** Version allégée conseillée (fatigue, lendemain de match intense). */
  light: boolean;
  notes: string[];
}

/** Dernier planning vu par l'utilisateur, pour montrer ce qui a changé depuis. */
export interface PlanSnapshot {
  weekStart: IsoDate;
  sessions: Pick<PlannedGymSession, 'date' | 'templateKey' | 'optional' | 'startTime' | 'light'>[];
  acknowledgedAt: string;
}
