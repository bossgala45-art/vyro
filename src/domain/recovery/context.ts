import { expandOccurrences } from '../calendar/occurrences';
import { addDays } from '../calendar/time';
import { contextsFor, type CalendarData } from '../calendar/weekly';
import type { IsoDate } from '../common/dates';
import { estimateMinutes, templateLegDemand } from '../training/program';
import type { SessionTemplate, Workout } from '../training/types';
import type { ReadinessContext } from './engine';

interface ContextInput {
  today: IsoDate;
  data: CalendarData;
  workouts: readonly Workout[];
  /** Séance envisagée aujourd'hui (prévue ou prochaine), si un programme existe. */
  template: SessionTemplate | null;
}

/** Rassemble les données réelles (calendrier, séances) utilisées par le moteur de récupération. */
export function buildReadinessContext({ today, data, workouts, template }: ContextInput): ReadinessContext {
  const [day] = contextsFor(data, [today]);
  const basket = expandOccurrences(data.activities, data.exceptions, data.vacations, addDays(today, -2), today).filter(
    (occurrence) => !occurrence.suspended && occurrence.kind !== 'other',
  );
  const completed = workouts
    .filter((workout) => workout.status === 'completed')
    .sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt));
  const last = completed.find((workout) => workout.date < today);
  const legDemand = template ? templateLegDemand(template) : 'none';

  return {
    today,
    isMatchDay: day?.isMatchDay ?? false,
    matchTomorrow: day?.matchTomorrow ?? false,
    matchYesterday: day?.matchYesterday ?? null,
    basketSessions3Days: basket.length,
    lastWorkout: last ? { date: last.date, sessionRpe: last.sessionRpe } : null,
    workoutDoneToday: completed.some((workout) => workout.date === today),
    plannedLegSession: legDemand === 'moderate' || legDemand === 'high',
    plannedMinutes: template ? estimateMinutes(template.slots) : null,
  };
}
