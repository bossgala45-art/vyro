import type { IsoDate } from '../common/dates';
import { weekdayOf } from '../training/schedule';
import { addDays, overlaps, toMinutes } from './time';
import type { Activity, Occurrence, OccurrenceException, Vacation } from './types';

export function occurrenceId(activityId: string, originalDate: IsoDate): string {
  return `${activityId}@${originalDate}`;
}

export function vacationOn(date: IsoDate, vacations: readonly Vacation[]): Vacation | undefined {
  return vacations.find((vacation) => vacation.start <= date && date <= vacation.end);
}

/**
 * Occurrences concrètes entre `from` et `to` (inclus).
 * - Une activité récurrente produit une occurrence chaque semaine, dans sa période de validité.
 * - Une exception annule ou reporte UNE occurrence sans toucher aux autres.
 * - Une occurrence reportée garde son identifiant d'origine (suivi, historique).
 * - Des vacances suspendent les entraînements et matchs (marqués, pas effacés).
 */
export function expandOccurrences(
  activities: readonly Activity[],
  exceptions: readonly OccurrenceException[],
  vacations: readonly Vacation[],
  from: IsoDate,
  to: IsoDate,
): Occurrence[] {
  const result: Occurrence[] = [];
  const exceptionFor = (activityId: string, date: IsoDate) =>
    exceptions.find((exception) => exception.activityId === activityId && exception.date === date);

  const push = (activity: Activity, originalDate: IsoDate, recurring: boolean) => {
    const exception = recurring ? exceptionFor(activity.id, originalDate) : undefined;
    if (exception?.action === 'cancel') return;
    const date = exception?.action === 'move' && exception.newDate ? exception.newDate : originalDate;
    if (date < from || date > to) return;
    const startTime = exception?.action === 'move' && exception.newStartTime !== null ? exception.newStartTime : activity.startTime;
    const vacation = vacationOn(date, vacations);
    result.push({
      id: recurring ? occurrenceId(activity.id, originalDate) : activity.id,
      activityId: activity.id,
      kind: activity.kind,
      title: activity.title,
      date,
      startTime,
      durationMinutes: activity.durationMinutes,
      movedFrom: date !== originalDate ? originalDate : null,
      suspended: Boolean(vacation?.basketballSuspended && activity.kind !== 'other'),
      recurring,
    });
  };

  // Une occurrence reportée peut sortir de sa semaine : on élargit la recherche des dates d'origine.
  const MAX_MOVE_DAYS = 60;
  for (const activity of activities) {
    if (activity.recurrence) {
      const { weekday, from: validFrom, until } = activity.recurrence;
      let date = addDays(from, -MAX_MOVE_DAYS);
      while (weekdayOf(date) !== weekday) date = addDays(date, 1);
      const last = addDays(to, MAX_MOVE_DAYS);
      for (; date <= last; date = addDays(date, 7)) {
        if (date < validFrom || (until !== null && date > until)) continue;
        push(activity, date, true);
      }
    } else if (activity.date) {
      push(activity, activity.date, false);
    }
  }

  return result.sort(
    (a, b) => a.date.localeCompare(b.date) || (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99') || a.title.localeCompare(b.title),
  );
}

export interface Conflict {
  a: Occurrence;
  b: Occurrence;
}

function interval(occurrence: Pick<Occurrence, 'startTime' | 'durationMinutes'>) {
  if (occurrence.startTime === null) return null;
  const start = toMinutes(occurrence.startTime);
  return { start, end: start + (occurrence.durationMinutes ?? 60) };
}

/** Chevauchements horaires entre occurrences actives d'une même date. Sans horaire : non vérifiable. */
export function findConflicts(occurrences: readonly Occurrence[]): Conflict[] {
  const active = occurrences.filter((occurrence) => !occurrence.suspended);
  const conflicts: Conflict[] = [];
  active.forEach((a, i) => {
    for (const b of active.slice(i + 1)) {
      if (a.date !== b.date) continue;
      const ia = interval(a);
      const ib = interval(b);
      if (ia && ib && overlaps(ia, ib)) conflicts.push({ a, b });
    }
  });
  return conflicts;
}

/** Occurrences avec lesquelles un créneau candidat se chevaucherait. */
export function conflictsWith(
  candidate: { date: IsoDate; startTime: string | null; durationMinutes: number | null; id?: string },
  occurrences: readonly Occurrence[],
): Occurrence[] {
  const ic = interval(candidate);
  if (!ic) return [];
  return occurrences.filter((occurrence) => {
    if (occurrence.suspended || occurrence.date !== candidate.date || occurrence.id === candidate.id) return false;
    const io = interval(occurrence);
    return io !== null && overlaps(ic, io);
  });
}
