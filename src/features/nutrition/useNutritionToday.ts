import { useBodyWeights, useDrinks, useMeals, useSettings } from '../../data/hooks';
import { contextsFor, planForWeek } from '../../domain/calendar/weekly';
import type { IsoDate } from '../../domain/common/dates';
import { adviseDay, type DayAdvice, type NutritionDay } from '../../domain/nutrition/advice';
import { breakfastOftenSkipped, summarizeHabits } from '../../domain/nutrition/habits';
import { drinksOn, hydrationTarget, type HydrationTarget } from '../../domain/nutrition/hydration';
import type { DrinkEntry, HydrationSettings, MealEntry } from '../../domain/nutrition/types';
import type { Profile } from '../../domain/profile/types';
import { weekStart } from '../../domain/training/schedule';
import { useReadinessData } from '../recovery/readiness';

export interface NutritionToday {
  today: IsoDate;
  day: NutritionDay;
  advice: DayAdvice;
  hydration: HydrationSettings;
  target: HydrationTarget;
  drinksToday: DrinkEntry[];
  drankMl: number;
  meals: MealEntry[];
  drinks: DrinkEntry[];
  profile: Profile | null;
  /** Dernière pesée enregistrée, `null` s'il n'y en a pas. */
  weightKg: number | null;
}

/** Données réelles du jour (calendrier, séances, journal) utilisées par le module nutrition. */
export function useNutritionToday(): NutritionToday | undefined {
  const base = useReadinessData();
  const settings = useSettings();
  const meals = useMeals();
  const drinks = useDrinks();
  const weights = useBodyWeights();
  if (!base || !settings || !meals || !drinks || !weights) return undefined;

  const { readiness, data, program, profile, workouts } = base;
  const today = readiness.today;
  const [context] = contextsFor(data, [today]);
  const planned =
    program && profile
      ? planForWeek({ data, program, workouts, sessionMinutes: profile.training.sessionMinutes, monday: weekStart(today), today }).sessions.find(
          (session) => session.date === today,
        )
      : undefined;
  const doneToday = workouts.some((workout) => workout.status === 'completed' && workout.date === today);
  const activities = context?.activities ?? [];
  const match = activities.find((activity) => activity.kind === 'match');

  const day: NutritionDay = {
    match: match ? { startTime: match.startTime } : null,
    practices: activities.filter((activity) => activity.kind === 'practice').map((activity) => ({ startTime: activity.startTime })),
    gym: planned ? { startTime: planned.startTime } : doneToday ? { startTime: null } : null,
    matchTomorrow: context?.matchTomorrow ?? false,
  };
  const habits = summarizeHabits(meals, drinks, today, 7);
  const advice = adviseDay(day, { breakfastOftenSkipped: breakfastOftenSkipped(habits) });
  const hydration = settings.nutrition.hydration;
  const target = hydrationTarget(hydration, advice.sportSessions);
  const drinksToday = drinksOn(drinks, today);

  return {
    today,
    day,
    advice,
    hydration,
    target,
    drinksToday,
    drankMl: drinksToday.reduce((sum, drink) => sum + drink.ml, 0),
    meals,
    drinks,
    profile,
    weightKg: weights[0]?.kg ?? null,
  };
}
