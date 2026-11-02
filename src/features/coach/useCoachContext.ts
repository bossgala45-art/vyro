import { todayIso } from '../../app/clock';
import { useBodyWeights, useCheckIns, useDrinks, useMeasurements, useMotivation, usePlanSnapshot, useProgressPhotos, useSettings } from '../../data/hooks';
import type { CoachContext } from '../../domain/coach/types';
import { toIsoDate } from '../../domain/common/dates';
import { diffPlans } from '../../domain/calendar/diff';
import { weightSeries } from '../../domain/progress/series';
import { weekStart } from '../../domain/training/schedule';
import { computeWeek } from '../calendar/usePlanning';
import { useReadinessData } from '../recovery/readiness';
import { formatShortDate } from '../training/format';

/** Rassemble les données réelles lues par le coach. Rien n'est écrit ici. */
export function useCoachContext(): CoachContext | undefined {
  const today = todayIso();
  const monday = weekStart(today);
  const base = useReadinessData();
  const settings = useSettings();
  const checkIns = useCheckIns();
  const weights = useBodyWeights();
  const measurements = useMeasurements();
  const photos = useProgressPhotos();
  const drinks = useDrinks();
  const motivation = useMotivation();
  const snapshot = usePlanSnapshot(monday);
  if (!base || !settings || !checkIns || !weights || !measurements || !photos || !drinks || !motivation || snapshot?.weekStart !== monday) {
    return undefined;
  }

  const { readiness, data, program, profile, workouts } = base;
  const week = computeWeek(monday, today, data, program, profile, workouts);
  const day = week.days.find((item) => item.date === today);
  const upcoming = week.plan?.sessions.filter((session) => session.date >= today) ?? [];
  const planChanges =
    week.plan && snapshot.snapshot
      ? diffPlans(
          snapshot.snapshot.sessions.filter((session) => session.date >= today),
          upcoming,
          (date) => formatShortDate(date).toLocaleLowerCase('fr'),
          (date) => week.plan?.excludedDays.find((excluded) => excluded.date === date)?.reason,
        )
      : [];

  return {
    today,
    firstName: profile?.firstName ?? null,
    goal: profile ? { type: profile.goal.type, targetDate: profile.goal.targetDate } : null,
    startDate: profile ? toIsoDate(new Date(profile.createdAt)) : null,
    program,
    workouts,
    week: week.plan ? { sessions: week.plan.sessions, explanations: week.plan.explanations, excludedDays: week.plan.excludedDays } : null,
    planChanges,
    day: {
      isMatchDay: day?.isMatchDay ?? false,
      matchTomorrow: day?.matchTomorrow ?? false,
      matchYesterday: day?.matchYesterday ?? null,
      vacation: day?.vacation != null,
      activities: (day?.activities ?? []).map((activity) => ({ kind: activity.kind, title: activity.title, startTime: activity.startTime })),
    },
    readiness: {
      level: readiness.decision.level,
      reasons: readiness.decision.reasons,
      advice: readiness.decision.advice,
      missing: readiness.decision.missing,
      hasCheckIn: readiness.checkIn !== null,
      template: readiness.template ? { key: readiness.template.key, name: readiness.template.name } : null,
      plannedToday: readiness.plannedToday,
    },
    thresholds: settings.recovery.thresholds,
    checkIns,
    weights: weightSeries(weights),
    measurements,
    photoDates: photos.map((photo) => photo.date),
    drinks,
    hydrationBaseMl: settings.nutrition.hydration.baseGoalMl,
    activityLogs: data.logs,
    motivation,
    state: settings.coach,
  };
}
