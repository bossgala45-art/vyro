import { useEffect } from 'react';
import { nowIso, todayIso } from '../../app/clock';
import { usePlanSnapshot } from '../../data/hooks';
import { useReadinessData } from '../recovery/readiness';
import { calendarRepository } from '../../data/repositories/calendarRepository';
import { diffPlans, toSnapshot, type PlanChange } from '../../domain/calendar/diff';
import { expandOccurrences } from '../../domain/calendar/occurrences';
import type { WeekPlan } from '../../domain/calendar/planner';
import { addDays } from '../../domain/calendar/time';
import { planForWeek, weekDays, contextsFor, type CalendarData } from '../../domain/calendar/weekly';
import type { IsoDate } from '../../domain/common/dates';
import type { Profile } from '../../domain/profile/types';
import { weekStatuses, type DayStatus } from '../../domain/training/schedule';
import type { Program, Workout } from '../../domain/training/types';
import { formatShortDate } from '../training/format';

export interface WeekView {
  monday: IsoDate;
  today: IsoDate;
  data: CalendarData;
  program: Program | null;
  profile: Profile | null;
  workouts: Workout[];
  days: ReturnType<typeof contextsFor>;
  /** Toutes les occurrences de la semaine, y compris suspendues (affichées barrées). */
  occurrences: ReturnType<typeof expandOccurrences>;
  /** `null` sans programme. */
  plan: (WeekPlan & { days: ReturnType<typeof contextsFor> }) | null;
  statuses: Map<IsoDate, DayStatus>;
}

export function computeWeek(
  monday: IsoDate,
  today: IsoDate,
  data: CalendarData,
  program: Program | null,
  profile: Profile | null,
  workouts: Workout[],
): WeekView {
  const plan =
    program && profile
      ? planForWeek({ data, program, workouts, sessionMinutes: profile.training.sessionMinutes, monday, today })
      : null;
  const completed = workouts.filter((workout) => workout.status === 'completed' && workout.date >= monday && workout.date <= addDays(monday, 6));
  return {
    monday,
    today,
    data,
    program,
    profile,
    workouts,
    days: plan?.days ?? contextsFor(data, weekDays(monday)),
    occurrences: expandOccurrences(data.activities, data.exceptions, data.vacations, monday, addDays(monday, 6)),
    plan,
    statuses: plan ? weekStatuses(plan.sessions, today, completed) : new Map(),
  };
}

/** Données d'une semaine, recalculées dès que le calendrier ou les séances changent. */
export function useWeek(monday: IsoDate): WeekView | undefined {
  const day = useReadinessData();
  if (!day) return undefined;
  return computeWeek(monday, todayIso(), day.data, day.program, day.profile, day.workouts);
}

/**
 * Changements du planning depuis la dernière fois que l'utilisateur l'a vu (séances à venir).
 * Au premier affichage, le planning sert de référence sans afficher de changement.
 */
export function usePlanChanges(week: WeekView | undefined): { changes: PlanChange[]; acknowledge: () => void } {
  const result = usePlanSnapshot(week?.monday ?? '');
  // `undefined` tant que la lecture ne correspond pas à la semaine affichée.
  const snapshot = week && result?.weekStart === week.monday ? result.snapshot : undefined;
  const upcoming = week?.plan?.sessions.filter((session) => session.date >= week.today) ?? [];

  useEffect(() => {
    if (week?.plan && snapshot === null) {
      void calendarRepository.saveSnapshot(toSnapshot(week.monday, upcoming, nowIso())).catch(() => undefined);
    }
    // Uniquement à la première visite de la semaine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week?.monday, snapshot === null, Boolean(week?.plan)]);

  if (!week?.plan || !snapshot) return { changes: [], acknowledge: () => undefined };
  const previous = snapshot.sessions.filter((session) => session.date >= week.today);
  const changes = diffPlans(previous, upcoming, (date) => formatShortDate(date).toLocaleLowerCase('fr'), (date) =>
    week.plan?.excludedDays.find((day) => day.date === date)?.reason,
  );
  return {
    changes,
    acknowledge: () => void calendarRepository.saveSnapshot(toSnapshot(week.monday, upcoming, nowIso())).catch(() => undefined),
  };
}
