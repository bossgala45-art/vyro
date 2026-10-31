import { toIsoDate, type IsoDate } from '../domain/common/dates';

/** Date locale du jour. Isolée ici pour que le domaine reste déterministe. */
export function todayIso(): IsoDate {
  return toIsoDate(new Date());
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Heure locale courante au format HH:MM. */
export function nowLocalTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}
