import type { IsoDate } from '../common/dates';
import { addDays } from './time';
import type { Activity } from './types';

/**
 * Modification d'une activité habituelle sans réécrire le passé.
 * Si l'horaire, le jour ou le type d'une activité récurrente déjà commencée change,
 * l'ancienne série s'arrête hier et une nouvelle commence aujourd'hui : les occurrences
 * passées (et leur suivi) restent telles qu'elles ont eu lieu.
 */
export function planActivityUpdate(existing: Activity, updated: Activity, today: IsoDate, newId: string): Activity[] {
  const before = existing.recurrence;
  const after = updated.recurrence;
  if (!before || !after || before.from >= today) return [updated];

  const scheduleChanged =
    before.weekday !== after.weekday ||
    existing.startTime !== updated.startTime ||
    existing.durationMinutes !== updated.durationMinutes ||
    existing.kind !== updated.kind;
  if (!scheduleChanged) return [updated];

  const yesterday = addDays(today, -1);
  const closed: Activity = {
    ...existing,
    recurrence: { ...before, until: before.until !== null && before.until < yesterday ? before.until : yesterday },
    updatedAt: updated.updatedAt,
  };
  const next: Activity = {
    ...updated,
    id: newId,
    recurrence: { ...after, from: after.from > today ? after.from : today },
    createdAt: updated.updatedAt,
  };
  return [closed, next];
}
