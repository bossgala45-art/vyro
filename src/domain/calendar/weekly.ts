import { toIsoDate, type IsoDate } from '../common/dates';
import { nextCoreTemplate, weekStart as mondayOf } from '../training/schedule';
import type { Program, TemplateKey, Workout } from '../training/types';
import { lastCompletedCoreKey } from '../training/workout';
import { expandOccurrences } from './occurrences';
import { buildDayContexts, planWeekFromCalendar, type DayContext, type WeekPlan } from './planner';
import { addDays, dateRange } from './time';
import type { Activity, ActivityLog, DayOverride, OccurrenceException, PlanningSettings, Vacation } from './types';

export interface CalendarData {
  activities: readonly Activity[];
  exceptions: readonly OccurrenceException[];
  vacations: readonly Vacation[];
  overrides: readonly DayOverride[];
  planning: PlanningSettings | null;
  logs: readonly ActivityLog[];
}

export function weekDays(monday: IsoDate): IsoDate[] {
  return dateRange(monday, addDays(monday, 6));
}

export function contextsFor(data: CalendarData, dates: readonly IsoDate[]): DayContext[] {
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (!first || !last) return [];
  const occurrences = expandOccurrences(data.activities, data.exceptions, data.vacations, addDays(first, -1), addDays(last, 1));
  return buildDayContexts({ dates, planning: data.planning, overrides: data.overrides, vacations: data.vacations, occurrences, logs: data.logs });
}

interface PlanOptions {
  data: CalendarData;
  program: Program;
  workouts: readonly Workout[];
  sessionMinutes: { min: number; max: number };
  monday: IsoDate;
  today: IsoDate;
}

/**
 * Planning d'une semaine. Semaine en cours ou passée : la rotation part de la dernière séance
 * réellement faite avant le lundi. Semaine future : elle enchaîne sur les semaines planifiées
 * entre-temps (aucune séance n'est « rattrapée »).
 */
export function planForWeek({ data, program, workouts, sessionMinutes, monday, today }: PlanOptions): WeekPlan & { days: DayContext[] } {
  const currentMonday = mondayOf(today);
  const firstDate = toIsoDate(new Date(program.createdAt));
  const plan = (week: IsoDate, nextCoreKey: TemplateKey) => {
    const days = contextsFor(data, weekDays(week));
    return {
      ...planWeekFromCalendar({
        days,
        program,
        nextCoreKey,
        includeOptionalThird: data.planning?.includeOptionalThird ?? false,
        sessionMinutes,
        firstDate,
      }),
      days,
    };
  };

  if (monday <= currentMonday) {
    const before = workouts.filter((workout) => workout.date < monday);
    return plan(monday, nextCoreTemplate(program, lastCompletedCoreKey(program, before)));
  }

  let lastKey = lastCompletedCoreKey(program, workouts.filter((workout) => workout.date < currentMonday));
  for (let week = currentMonday; week < monday; week = addDays(week, 7)) {
    const result = plan(week, nextCoreTemplate(program, lastKey));
    if (result.lastCoreKey) lastKey = result.lastCoreKey;
  }
  return plan(monday, nextCoreTemplate(program, lastKey));
}
