import { fromMinutes, isLocalTime, toMinutes } from '../calendar/time';
import type { LocalTime } from '../calendar/types';
import type { IsoDate } from '../common/dates';
import type { IcsEvent } from '../calendar/ics';
import { DEFAULT_HYDRATION, REMINDER_INTERVALS, type DrinkEntry, type HydrationReminders, type HydrationSettings } from './types';

export interface HydrationTarget {
  baseMl: number;
  extraMl: number;
  totalMl: number;
}

/** Au-delà de deux séances, le repère n'augmente plus : il reste un ordre de grandeur. */
const MAX_SPORT_SESSIONS = 2;

export function hydrationTarget(settings: HydrationSettings, sportSessions: number): HydrationTarget {
  const extraMl = settings.sportExtraMl * Math.min(Math.max(sportSessions, 0), MAX_SPORT_SESSIONS);
  return { baseMl: settings.baseGoalMl, extraMl, totalMl: settings.baseGoalMl + extraMl };
}

export function drinksOn(drinks: readonly DrinkEntry[], date: IsoDate): DrinkEntry[] {
  return drinks.filter((drink) => drink.date === date).sort((a, b) => a.time.localeCompare(b.time) || a.createdAt.localeCompare(b.createdAt));
}

export function totalMl(drinks: readonly DrinkEntry[], date: IsoDate): number {
  return drinksOn(drinks, date).reduce((sum, drink) => sum + drink.ml, 0);
}

/** Horaires des rappels de la journée, de `from` à `to` inclus. */
export function reminderTimes(reminders: HydrationReminders): LocalTime[] {
  const start = toMinutes(reminders.from);
  const end = toMinutes(reminders.to);
  const times: LocalTime[] = [];
  for (let minutes = start; minutes <= end && reminders.everyMinutes > 0; minutes += reminders.everyMinutes) {
    times.push(fromMinutes(minutes));
  }
  return times;
}

export interface ReminderState {
  /** Un rappel est dû maintenant (application ouverte). */
  due: boolean;
  /** Prochain horaire de rappel aujourd'hui, s'il en reste. */
  next: LocalTime | null;
}

/**
 * Rappel affiché dans l'application : dû si on est dans la plage horaire, que le repère n'est
 * pas atteint et qu'aucune boisson n'a été notée depuis l'intervalle choisi.
 */
export function reminderState(reminders: HydrationReminders, now: LocalTime, drinksToday: readonly DrinkEntry[], targetMl: number): ReminderState {
  if (!reminders.enabled) return { due: false, next: null };
  const current = toMinutes(now);
  const next = reminderTimes(reminders).find((time) => toMinutes(time) > current) ?? null;
  const total = drinksToday.reduce((sum, drink) => sum + drink.ml, 0);
  const inWindow = current >= toMinutes(reminders.from) && current <= toMinutes(reminders.to);
  if (!inWindow || total >= targetMl) return { due: false, next: total >= targetMl ? null : next };
  const last = drinksToday.reduce<number | null>((latest, drink) => Math.max(latest ?? 0, toMinutes(drink.time)), null);
  const since = current - (last ?? toMinutes(reminders.from));
  return { due: since >= reminders.everyMinutes, next };
}

export type HydrationErrors = Partial<Record<'baseGoalMl' | 'sportExtraMl' | 'glassMl' | 'reminders', string>>;

export function validateHydration(settings: HydrationSettings): HydrationErrors {
  const errors: HydrationErrors = {};
  const between = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max;
  if (!between(settings.baseGoalMl, 1000, 4000)) errors.baseGoalMl = 'Entre 1 000 et 4 000 ml.';
  if (!between(settings.sportExtraMl, 0, 1500)) errors.sportExtraMl = 'Entre 0 et 1 500 ml.';
  if (!between(settings.glassMl, 100, 1000)) errors.glassMl = 'Entre 100 et 1 000 ml.';
  const { from, to, everyMinutes } = settings.reminders;
  if (!isLocalTime(from) || !isLocalTime(to) || toMinutes(from) >= toMinutes(to)) {
    errors.reminders = 'L’heure de fin doit être après l’heure de début.';
  } else if (!REMINDER_INTERVALS.includes(everyMinutes as never)) {
    errors.reminders = 'Intervalle de rappel non proposé.';
  }
  return errors;
}

/** Complète des réglages enregistrés (ou absents) avec les valeurs par défaut. */
export function withHydrationDefaults(stored: Partial<HydrationSettings> | undefined): HydrationSettings {
  const merged: HydrationSettings = {
    ...DEFAULT_HYDRATION,
    ...stored,
    reminders: { ...DEFAULT_HYDRATION.reminders, ...stored?.reminders },
  };
  return Object.keys(validateHydration(merged)).length === 0 ? merged : { ...DEFAULT_HYDRATION, reminders: { ...DEFAULT_HYDRATION.reminders } };
}

/**
 * Rappels pour le Calendrier de l'iPhone : un événement court répété chaque jour par horaire,
 * avec une alerte. Ils sonnent même quand VYRO est fermé.
 */
export function reminderEvents(reminders: HydrationReminders, from: IsoDate): IcsEvent[] {
  return reminderTimes(reminders).map((time) => ({
    uid: `vyro-hydratation-${time.replace(':', '')}@vyro`,
    date: from,
    startTime: time,
    durationMinutes: 5,
    summary: 'VYRO · Pense à boire',
    description: 'Rappel d’hydratation exporté depuis VYRO. Pour l’arrêter, supprime cet événement répété.',
    alarmMinutes: 0,
    repeatDaily: true,
  }));
}
