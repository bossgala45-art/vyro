import { addDays, dateRange } from '../calendar/time';
import type { IsoDate } from '../common/dates';
import type { DrinkEntry, MealEntry, MealSlot } from './types';

export interface HabitDay {
  date: IsoDate;
  /** Repas notés comme mangés. */
  eaten: MealSlot[];
  skipped: MealSlot[];
  /** Total bu ; `null` si rien n'a été noté ce jour-là (différent de 0 bu). */
  drankMl: number | null;
}

/** Part des réponses « oui » parmi les repas où la question a reçu une réponse. */
export interface Share {
  yes: number;
  answered: number;
  /** Repas où la question est restée sans réponse (jamais comptés comme « non »). */
  unknown: number;
}

export interface HabitSummary {
  days: HabitDay[];
  /** Jours avec au moins un repas noté (mangé ou sauté). */
  daysLogged: number;
  breakfast: { eaten: number; skipped: number };
  protein: Share;
  fruitOrVegetable: Share;
  /** Portions ressenties ; les portions inconnues ne sont converties en rien. */
  portions: { small: number; normal: number; large: number; unknown: number };
  /** Jours où une boisson a été notée, et moyenne de ces jours-là seulement. */
  hydration: { daysLogged: number; averageMl: number | null };
}

const share = (meals: readonly MealEntry[], key: 'protein' | 'fruitOrVegetable'): Share => ({
  yes: meals.filter((meal) => meal[key] === true).length,
  answered: meals.filter((meal) => meal[key] !== null).length,
  unknown: meals.filter((meal) => meal[key] === null).length,
});

/** Habitudes sur les `count` derniers jours (aujourd'hui inclus), calculées sur les seules saisies réelles. */
export function summarizeHabits(meals: readonly MealEntry[], drinks: readonly DrinkEntry[], today: IsoDate, count: number): HabitSummary {
  const dates = dateRange(addDays(today, -(count - 1)), today);
  const inRange = (date: IsoDate) => date >= (dates[0] ?? today) && date <= today;
  const periodMeals = meals.filter((meal) => inRange(meal.date));
  const eatenMeals = periodMeals.filter((meal) => !meal.skipped);

  const days = dates.map((date): HabitDay => {
    const dayMeals = periodMeals.filter((meal) => meal.date === date);
    const dayDrinks = drinks.filter((drink) => drink.date === date);
    return {
      date,
      eaten: dayMeals.filter((meal) => !meal.skipped).map((meal) => meal.slot),
      skipped: dayMeals.filter((meal) => meal.skipped).map((meal) => meal.slot),
      drankMl: dayDrinks.length > 0 ? dayDrinks.reduce((sum, drink) => sum + drink.ml, 0) : null,
    };
  });
  const hydrated = days.filter((day) => day.drankMl !== null);

  return {
    days,
    daysLogged: days.filter((day) => day.eaten.length + day.skipped.length > 0).length,
    breakfast: {
      eaten: days.filter((day) => day.eaten.includes('breakfast')).length,
      skipped: days.filter((day) => day.skipped.includes('breakfast') && !day.eaten.includes('breakfast')).length,
    },
    protein: share(eatenMeals, 'protein'),
    fruitOrVegetable: share(eatenMeals, 'fruitOrVegetable'),
    portions: {
      small: eatenMeals.filter((meal) => meal.portion === 'small').length,
      normal: eatenMeals.filter((meal) => meal.portion === 'normal').length,
      large: eatenMeals.filter((meal) => meal.portion === 'large').length,
      unknown: eatenMeals.filter((meal) => meal.portion === null).length,
    },
    hydration: {
      daysLogged: hydrated.length,
      averageMl: hydrated.length > 0 ? Math.round(hydrated.reduce((sum, day) => sum + (day.drankMl ?? 0), 0) / hydrated.length) : null,
    },
  };
}

/** Petit-déjeuner sauté au moins 3 fois sur les jours renseignés (repère pour un conseil, pas un reproche). */
export function breakfastOftenSkipped(summary: HabitSummary): boolean {
  return summary.breakfast.skipped >= 3;
}
