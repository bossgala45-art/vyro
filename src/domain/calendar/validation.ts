import { daysBetween, isIsoDate, type IsoDate } from '../common/dates';
import { isLocalTime, toMinutes } from './time';
import type { ActivityKind, ActivityLog, Vacation } from './types';

export interface ActivityInput {
  kind: ActivityKind;
  title: string;
  startTime: string;
  durationMinutes: string;
  repeat: boolean;
  date: string;
  weekday: string;
  from: string;
  until: string;
}

export type ActivityErrors = Partial<Record<keyof ActivityInput, string>>;

export const ACTIVITY_LIMITS = { titleLength: 60, duration: { min: 15, max: 300 } } as const;

export function validateActivity(input: ActivityInput): ActivityErrors {
  const errors: ActivityErrors = {};
  const title = input.title.trim();
  if (!title) errors.title = 'Donne un nom à l’activité.';
  else if (title.length > ACTIVITY_LIMITS.titleLength) errors.title = `${ACTIVITY_LIMITS.titleLength} caractères maximum.`;
  if (input.startTime && !isLocalTime(input.startTime)) errors.startTime = 'Heure invalide (HH:MM).';
  if (input.durationMinutes.trim()) {
    const duration = Number(input.durationMinutes);
    const { min, max } = ACTIVITY_LIMITS.duration;
    if (!Number.isInteger(duration) || duration < min || duration > max) errors.durationMinutes = `Entre ${min} et ${max} minutes.`;
  }
  if (input.startTime && input.durationMinutes.trim() && !errors.startTime && !errors.durationMinutes) {
    if (toMinutes(input.startTime) + Number(input.durationMinutes) > 24 * 60) errors.durationMinutes = 'L’activité doit se terminer le même jour.';
  }
  if (input.repeat) {
    if (!/^[0-6]$/.test(input.weekday)) errors.weekday = 'Choisis un jour.';
    if (!isIsoDate(input.from)) errors.from = 'Date de début invalide.';
    if (input.until && (!isIsoDate(input.until) || (isIsoDate(input.from) && input.until < input.from))) {
      errors.until = 'La fin doit être après le début.';
    }
  } else if (!isIsoDate(input.date)) {
    errors.date = 'Choisis une date.';
  }
  return errors;
}

export function validateVacation(
  vacation: Pick<Vacation, 'start' | 'end'>,
  existing: readonly Vacation[],
  ignoreId?: string,
): string | undefined {
  if (!isIsoDate(vacation.start) || !isIsoDate(vacation.end)) return 'Choisis une date de début et de fin.';
  if (vacation.end < vacation.start) return 'La fin doit être après le début.';
  if (daysBetween(vacation.start, vacation.end) > 120) return 'Vacances de 4 mois maximum.';
  const overlap = existing.find(
    (other) => other.id !== ignoreId && other.start <= vacation.end && vacation.start <= other.end,
  );
  if (overlap) return `Chevauche des vacances déjà prévues (${overlap.start} → ${overlap.end}).`;
  return undefined;
}

export type LogErrors = Partial<Record<'intensity' | 'minutesPlayed' | 'points' | 'rebounds' | 'assists', string>>;

export function validateLog(log: Pick<ActivityLog, 'intensity' | 'minutesPlayed' | 'points' | 'rebounds' | 'assists'>): LogErrors {
  const errors: LogErrors = {};
  const check = (value: number | null, max: number) => value === null || (Number.isInteger(value) && value >= 0 && value <= max);
  if (log.intensity !== null && (!Number.isInteger(log.intensity) || log.intensity < 1 || log.intensity > 10)) {
    errors.intensity = 'Entre 1 et 10.';
  }
  if (!check(log.minutesPlayed, 120)) errors.minutesPlayed = 'Entre 0 et 120 minutes.';
  if (!check(log.points, 150)) errors.points = 'Valeur invalide.';
  if (!check(log.rebounds, 60)) errors.rebounds = 'Valeur invalide.';
  if (!check(log.assists, 60)) errors.assists = 'Valeur invalide.';
  return errors;
}

/** Moyennes calculées uniquement sur les matchs joués où la valeur a été notée. */
export function basketballSummary(logs: readonly ActivityLog[]) {
  const matches = logs.filter((log) => log.kind === 'match' && log.played);
  const average = (pick: (log: ActivityLog) => number | null) => {
    const values = matches.map(pick).filter((value): value is number => value !== null);
    return values.length > 0 ? { value: values.reduce((a, b) => a + b, 0) / values.length, count: values.length } : null;
  };
  return {
    matchesPlayed: matches.length,
    intensity: average((log) => log.intensity),
    minutes: average((log) => log.minutesPlayed),
    points: average((log) => log.points),
    rebounds: average((log) => log.rebounds),
    assists: average((log) => log.assists),
  };
}

export function isPastOrToday(date: IsoDate, today: IsoDate): boolean {
  return date <= today;
}
