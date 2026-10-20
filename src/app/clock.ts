import { toIsoDate, type IsoDate } from '../domain/common/dates';

/** Date locale du jour. Isolée ici pour que le domaine reste déterministe. */
export function todayIso(): IsoDate {
  return toIsoDate(new Date());
}

export function nowIso(): string {
  return new Date().toISOString();
}
