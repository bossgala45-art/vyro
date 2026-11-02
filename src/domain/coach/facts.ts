import { addDays } from '../calendar/time';
import type { IsoDate } from '../common/dates';
import { daysBetween } from '../common/dates';
import { exerciseName } from '../training/exercises';
import { newRecordsIn } from '../training/records';
import { weekStart } from '../training/schedule';
import type { Workout } from '../training/types';
import type { CoachContext } from './types';

/*
 * Faits calculés à partir des données réelles, partagés par les messages, les réponses,
 * les objectifs et les bilans. Aucun fait n'est supposé : sans donnée, la fonction le dit.
 */

const dayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export function frDate(date: IsoDate): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return dayFormat.format(new Date(y, m - 1, d));
}

export function fmt(value: number, unit: string): string {
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ${unit}`;
}

export function signed(value: number, unit: string): string {
  if (value === 0) return `stable (0 ${unit})`;
  return `${value > 0 ? '+' : '−'}${fmt(Math.abs(value), unit)}`;
}

export function completed(workouts: readonly Workout[]): Workout[] {
  return workouts
    .filter((workout) => workout.status === 'completed')
    .sort((a, b) => a.date.localeCompare(b.date) || a.startedAt.localeCompare(b.startedAt));
}

export function completedBetween(workouts: readonly Workout[], from: IsoDate, to: IsoDate): Workout[] {
  return completed(workouts).filter((workout) => workout.date >= from && workout.date <= to);
}

export interface RecordEvent {
  date: IsoDate;
  exerciseId: string;
  name: string;
  description: string;
}

/** Records battus séance après séance (une première réalisation n'est pas un record battu). */
export function recordEvents(workouts: readonly Workout[]): RecordEvent[] {
  const done = completed(workouts);
  return done.flatMap((workout, index) =>
    newRecordsIn(workout, done.slice(0, index)).map((record) => ({
      date: workout.date,
      exerciseId: record.exerciseId,
      name: exerciseName(record.exerciseId),
      description: record.description,
    })),
  );
}

export function daysSinceLastWorkout(ctx: CoachContext): number | null {
  const last = completed(ctx.workouts).pop();
  return last ? daysBetween(last.date, ctx.today) : null;
}

export function sessionsThisWeek(ctx: CoachContext): { planned: number; done: number } {
  const monday = weekStart(ctx.today);
  const done = completedBetween(ctx.workouts, monday, addDays(monday, 6)).length;
  return { planned: ctx.week?.sessions.length ?? 0, done };
}

export function plannedToday(ctx: CoachContext) {
  return ctx.week?.sessions.find((session) => session.date === ctx.today) ?? null;
}

export function inProgress(ctx: CoachContext): Workout | null {
  return ctx.workouts.find((workout) => workout.status === 'in-progress') ?? null;
}

/** Moyenne des seules valeurs renseignées ; `null` sans aucune valeur. */
export function average(values: readonly (number | null)[]): { value: number; count: number } | null {
  const known = values.filter((value): value is number => value !== null);
  if (known.length === 0) return null;
  return { value: Math.round((known.reduce((sum, value) => sum + value, 0) / known.length) * 10) / 10, count: known.length };
}

export function drankOn(ctx: CoachContext, date: IsoDate): number | null {
  const drinks = ctx.drinks.filter((drink) => drink.date === date);
  return drinks.length > 0 ? drinks.reduce((sum, drink) => sum + drink.ml, 0) : null;
}
