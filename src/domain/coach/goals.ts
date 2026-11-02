import { addDays, dateRange } from '../calendar/time';
import { weekStart } from '../training/schedule';
import { completedBetween, drankOn } from './facts';
import type { CoachContext } from './types';

export interface WeeklyGoal {
  id: 'gym' | 'checkins' | 'hydration';
  label: string;
  done: number;
  target: number;
  /** D'où vient l'objectif (règle documentée). */
  why: string;
}

/** Jours au repère d'hydratation visés par semaine (repère réaliste, pas une obligation). */
export const HYDRATION_DAYS_GOAL = 5;

/**
 * Objectifs de la semaine, tirés du planning réel. Un objectif sans base (pas de programme,
 * aucune séance planifiée) n'est pas proposé plutôt qu'inventé.
 */
export function weeklyGoals(ctx: CoachContext): WeeklyGoal[] {
  const monday = weekStart(ctx.today);
  const sunday = addDays(monday, 6);
  const days = dateRange(monday, sunday);
  const goals: WeeklyGoal[] = [];

  const planned = ctx.week?.sessions.length ?? 0;
  if (planned > 0) {
    goals.push({
      id: 'gym',
      label: 'Séances de musculation',
      done: completedBetween(ctx.workouts, monday, sunday).length,
      target: planned,
      why: `${planned} séance${planned > 1 ? 's' : ''} placée${planned > 1 ? 's' : ''} par ton planning cette semaine.`,
    });
  }

  const sportDays = new Set(ctx.week?.sessions.map((session) => session.date) ?? []);
  // Les jours de basket ne sont connus que par le planning du jour ; on compte au moins les séances.
  const checkInTarget = Math.max(sportDays.size, 3);
  goals.push({
    id: 'checkins',
    label: 'Check-ins de récupération',
    done: ctx.checkIns.filter((checkIn) => checkIn.date >= monday && checkIn.date <= sunday).length,
    target: checkInTarget,
    why: 'Un check-in les jours de séance (3 au minimum) pour adapter l’intensité.',
  });

  goals.push({
    id: 'hydration',
    label: 'Jours au repère d’hydratation',
    done: days.filter((date) => (drankOn(ctx, date) ?? 0) >= ctx.hydrationBaseMl).length,
    target: HYDRATION_DAYS_GOAL,
    why: `${HYDRATION_DAYS_GOAL} jours sur 7 à ton repère de base (${ctx.hydrationBaseMl.toLocaleString('fr-FR')} ml).`,
  });

  return goals;
}
