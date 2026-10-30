import type { IsoDate } from '../common/dates';
import { estimateMinutes, templateLegDemand } from '../training/program';
import { weekdayOf, WEEKDAY_LABELS } from '../training/schedule';
import type { Program, SessionTemplate, TemplateKey, Weekday } from '../training/types';
import { vacationOn } from './occurrences';
import { addDays, fromMinutes, subtractIntervals, toMinutes, type Interval } from './time';
import type { ReadinessLevel } from '../recovery/types';
import type { ActivityLog, DayOverride, LocalTime, Occurrence, PlannedGymSession, PlanningSettings, Vacation } from './types';

/**
 * Moteur d'adaptation : place les séances de musculation dans une semaine concrète
 * (calendrier réel, exceptions, vacances, fatigue, temps disponible).
 *
 * Il ne modifie jamais l'historique : il recalcule uniquement les séances à venir,
 * et chaque décision est expliquée.
 */

export const PLANNER_RULES = {
  /** Marge (minutes) gardée avant et après une activité de basket. */
  bufferMinutes: 30,
  /** Intensité de match (1–10) à partir de laquelle le lendemain est allégé. */
  intenseMatch: 8,
  penalties: {
    consecutiveGymDays: 5,
    dayAfterMatch: 3,
    dayAfterIntenseMatch: 2,
    practiceSameDay: 2,
    otherActivitySameDay: 1,
    fatigue: 4,
  },
  /** Au-delà, la séance facultative n'est pas proposée. */
  maxOptionalPenalty: 2,
} as const;

export interface DayContext {
  date: IsoDate;
  weekday: Weekday;
  gym: { available: boolean; window: { from: LocalTime | null; to: LocalTime | null } | null; reason: string | null };
  /** Activités actives (non suspendues) du jour. */
  activities: Occurrence[];
  isMatchDay: boolean;
  matchTomorrow: boolean;
  /** Match la veille, avec son intensité si elle a été notée. */
  matchYesterday: { intensity: number | null } | null;
  practice: boolean;
  fatigue: boolean;
  rest: boolean;
  vacation: Vacation | null;
}

interface ContextInput {
  dates: readonly IsoDate[];
  planning: PlanningSettings | null;
  overrides: readonly DayOverride[];
  vacations: readonly Vacation[];
  /** Occurrences couvrant au moins la veille et le lendemain des dates. */
  occurrences: readonly Occurrence[];
  logs: readonly ActivityLog[];
  /** Décision du check-in de récupération par date. */
  readiness?: ReadonlyMap<IsoDate, ReadinessLevel> | undefined;
}

export function buildDayContexts({ dates, planning, overrides, vacations, occurrences, logs, readiness }: ContextInput): DayContext[] {
  const active = occurrences.filter((occurrence) => !occurrence.suspended);
  const on = (date: IsoDate) => active.filter((occurrence) => occurrence.date === date);
  const matchOn = (date: IsoDate) => on(date).filter((occurrence) => occurrence.kind === 'match');

  return dates.map((date) => {
    const weekday = weekdayOf(date);
    const override = overrides.find((item) => item.date === date);
    const vacation = vacationOn(date, vacations) ?? null;
    const slot = planning?.gymSlots.find((item) => item.weekday === weekday);

    const checkIn = readiness?.get(date);
    let gym: DayContext['gym'];
    if (override?.rest) gym = { available: false, window: null, reason: 'jour de repos' };
    else if (checkIn === 'rest') gym = { available: false, window: null, reason: 'repos conseillé par ton check-in' };
    else if (checkIn === 'light') gym = { available: false, window: null, reason: 'activité légère conseillée par ton check-in' };
    else if (vacation?.gym === 'none') gym = { available: false, window: null, reason: 'vacances sans salle' };
    else if (override?.gymUnavailable) gym = { available: false, window: null, reason: 'salle indisponible ce jour-là' };
    else if (override?.gymWindow) gym = { available: true, window: override.gymWindow, reason: null };
    else if (slot) gym = { available: true, window: slot.from || slot.to ? { from: slot.from, to: slot.to } : null, reason: null };
    else gym = { available: false, window: null, reason: 'pas de disponibilité pour la salle' };

    const yesterdayMatches = matchOn(addDays(date, -1));
    const yesterdayIntensity = yesterdayMatches
      .map((match) => logs.find((log) => log.id === match.id)?.intensity ?? null)
      .reduce<number | null>((max, value) => (value === null ? max : Math.max(max ?? 0, value)), null);

    return {
      date,
      weekday,
      gym,
      activities: on(date),
      isMatchDay: matchOn(date).length > 0,
      matchTomorrow: matchOn(addDays(date, 1)).length > 0,
      matchYesterday: yesterdayMatches.length > 0 ? { intensity: yesterdayIntensity } : null,
      practice: on(date).some((occurrence) => occurrence.kind === 'practice'),
      fatigue: (override?.fatigue ?? false) || checkIn === 'adapted',
      rest: override?.rest ?? false,
      vacation,
    };
  });
}

interface TimeSlot {
  startTime: LocalTime | null;
  availableMinutes: number | null;
  notes: string[];
}

/** Cherche un créneau libre pour la séance, en évitant les activités du jour. */
export function findTimeSlot(day: DayContext, neededMinutes: number, minimumMinutes: number): TimeSlot | { reason: string } {
  const notes: string[] = [];
  const timed = day.activities.filter((activity) => activity.startTime !== null);
  for (const activity of day.activities.filter((item) => item.startTime === null)) {
    notes.push(`Horaire de « ${activity.title} » inconnu : vérifie qu’il n’y a pas de conflit.`);
  }

  const window = day.gym.window;
  if (!window || window.from === null || window.to === null) {
    if (timed.length > 0) {
      const busy = timed.map((activity) => `${activity.title} à ${activity.startTime}`).join(', ');
      notes.push(`Choisis un horaire qui laisse au moins ${PLANNER_RULES.bufferMinutes} min avec : ${busy}.`);
    }
    return { startTime: null, availableMinutes: null, notes };
  }

  const busy: Interval[] = timed.map((activity) => {
    const start = toMinutes(activity.startTime as LocalTime);
    return {
      start: start - PLANNER_RULES.bufferMinutes,
      end: start + (activity.durationMinutes ?? 90) + PLANNER_RULES.bufferMinutes,
    };
  });
  const free = subtractIntervals({ start: toMinutes(window.from), end: toMinutes(window.to) }, busy);
  const enough = free.find((piece) => piece.end - piece.start >= neededMinutes);
  if (enough) return { startTime: fromMinutes(enough.start), availableMinutes: null, notes };

  const longest = [...free].sort((a, b) => b.end - b.start - (a.end - a.start))[0];
  const length = longest ? longest.end - longest.start : 0;
  if (longest && length >= minimumMinutes) {
    notes.push(`Seulement ${length} min disponibles : termine par les exercices principaux et passe les derniers accessoires.`);
    return { startTime: fromMinutes(longest.start), availableMinutes: length, notes };
  }
  return { reason: `pas assez de temps libre (${length} min, il en faut au moins ${minimumMinutes})` };
}

export type WeekPlanStatus = 'ok' | 'unknown-availability' | 'no-valid-day' | 'reduced';

export interface WeekPlan {
  status: WeekPlanStatus;
  sessions: PlannedGymSession[];
  explanations: string[];
  /** Jours où la salle était possible mais exclus, avec la raison. */
  excludedDays: { date: IsoDate; reason: string }[];
  /** Dernière séance principale planifiée (pour enchaîner la rotation la semaine suivante). */
  lastCoreKey: TemplateKey | null;
}

interface PlanInput {
  days: readonly DayContext[];
  program: Program;
  nextCoreKey: TemplateKey;
  includeOptionalThird: boolean;
  sessionMinutes: { min: number; max: number };
  /** Aucune séance avant cette date (programme créé en cours de semaine). */
  firstDate?: IsoDate;
}

function combinations<T>(items: readonly T[], size: number): T[][] {
  if (size === 0) return [[]];
  return items.flatMap((item, index) => combinations(items.slice(index + 1), size - 1).map((rest) => [item, ...rest]));
}

const hasLegs = (template: SessionTemplate) => ['moderate', 'high'].includes(templateLegDemand(template));

const dayLabel = (date: IsoDate) => WEEKDAY_LABELS[weekdayOf(date)];

export function planWeekFromCalendar({ days, program, nextCoreKey, includeOptionalThird, sessionMinutes, firstDate }: PlanInput): WeekPlan {
  const explanations: string[] = [];
  const excludedDays: WeekPlan['excludedDays'] = [];
  const empty = (status: WeekPlanStatus, message: string): WeekPlan => ({
    status,
    sessions: [],
    explanations: [...explanations, message],
    excludedDays,
    lastCoreKey: null,
  });

  if (days.every((day) => !day.gym.available && day.gym.reason === 'pas de disponibilité pour la salle')) {
    return empty('unknown-availability', 'Indique tes disponibilités pour la salle : VYRO ne planifie rien sans les connaître.');
  }
  if (firstDate && days.some((day) => day.date < firstDate)) {
    explanations.push('Programme commencé en cours de semaine : planning à partir de ce jour seulement.');
  }

  const core = program.templates.filter((template) => !template.optional);
  const coreOrder = [...core].sort((a, b) => (a.key === nextCoreKey ? -1 : b.key === nextCoreKey ? 1 : a.key.localeCompare(b.key)));
  const optional = program.templates.find((template) => template.optional);

  const needed = (template: SessionTemplate) => Math.min(estimateMinutes(template.slots), sessionMinutes.max);

  /** Raison d'exclure un jour pour une séance, ou le créneau trouvé. */
  const evaluate = (day: DayContext, template: SessionTemplate): TimeSlot | { reason: string } => {
    if (firstDate && day.date < firstDate) return { reason: 'avant le début du programme' };
    if (!day.gym.available) return { reason: day.gym.reason ?? 'salle indisponible' };
    if (day.isMatchDay) return { reason: 'jour de match' };
    if (hasLegs(template) && day.matchTomorrow) return { reason: 'veille de match (séance avec travail de jambes)' };
    return findTimeSlot(day, needed(template), sessionMinutes.min);
  };

  const dayPenalty = (day: DayContext) => {
    const p = PLANNER_RULES.penalties;
    let score = 0;
    if (day.matchYesterday) {
      score += p.dayAfterMatch;
      if ((day.matchYesterday.intensity ?? 0) >= PLANNER_RULES.intenseMatch) score += p.dayAfterIntenseMatch;
    }
    if (day.practice) score += p.practiceSameDay;
    if (day.activities.some((activity) => activity.kind === 'other')) score += p.otherActivitySameDay;
    if (day.fatigue) score += p.fatigue;
    return score;
  };
  const spacing = (chosen: readonly number[]) =>
    chosen.reduce<number>((total, index) => total + (chosen.includes(index + 1) ? PLANNER_RULES.penalties.consecutiveGymDays : 0), 0);

  const indices = days.map((_, index) => index);
  const bestFor = (count: number) => {
    let best: { chosen: number[]; score: number } | null = null;
    for (const chosen of combinations(indices, count)) {
      const valid = chosen.every((dayIndex, order) => {
        const template = coreOrder[order];
        const day = days[dayIndex];
        return template && day && !('reason' in evaluate(day, template));
      });
      if (!valid) continue;
      const score = chosen.reduce<number>((total, dayIndex) => total + dayPenalty(days[dayIndex] as DayContext), 0) + spacing(chosen);
      if (!best || score < best.score) best = { chosen, score };
    }
    return best;
  };

  let count = coreOrder.length;
  let best = bestFor(count);
  while (!best && count > 1) {
    count -= 1;
    best = bestFor(count);
  }

  // Jours exclus par une règle (affichés dans « Pourquoi ce planning ? »).
  const firstCore = coreOrder[0];
  for (const day of days) {
    if (!firstCore) break;
    if (!day.gym.available && day.gym.reason === 'pas de disponibilité pour la salle') continue;
    const verdict = evaluate(day, firstCore);
    if ('reason' in verdict && verdict.reason !== 'avant le début du programme') excludedDays.push({ date: day.date, reason: verdict.reason });
  }

  if (!best) return empty('no-valid-day', 'Aucun jour ne convient cette semaine (matchs, repos, vacances ou manque de temps). Pas de séance plus lourde pour compenser.');

  const sessions: PlannedGymSession[] = best.chosen.map((dayIndex, order) => {
    const day = days[dayIndex] as DayContext;
    const template = coreOrder[order] as SessionTemplate;
    return buildSession(day, template, false, evaluate(day, template) as TimeSlot);
  });

  explanations.push(
    `${sessions.length} séance${sessions.length > 1 ? 's' : ''} placée${sessions.length > 1 ? 's' : ''} sur tes disponibilités, jamais un jour de match.`,
  );
  if (days.some((day) => day.isMatchDay || day.matchTomorrow)) explanations.push('Pas de séance avec travail de jambes la veille d’un match.');
  if (sessions.length > 1 && spacing(best.chosen) === 0) explanations.push('Au moins 48 h entre deux séances de musculation.');
  if (count < coreOrder.length) {
    explanations.push('Semaine trop chargée pour toutes les séances : pas de rattrapage ni de séance plus lourde pour compenser.');
  }

  if (includeOptionalThird && optional && count === coreOrder.length) {
    const chosen = best.chosen;
    const candidate = indices
      .filter((index) => !chosen.includes(index))
      .map((index) => ({ index, verdict: evaluate(days[index] as DayContext, optional) }))
      .filter((item): item is { index: number; verdict: TimeSlot } => !('reason' in item.verdict))
      .map((item) => ({ ...item, score: dayPenalty(days[item.index] as DayContext) + spacing([...chosen, item.index]) - spacing(chosen) }))
      .filter((item) => item.score <= PLANNER_RULES.maxOptionalPenalty)
      .sort((a, b) => a.score - b.score || a.index - b.index)[0];
    if (candidate) {
      const session = buildSession(days[candidate.index] as DayContext, optional, true, candidate.verdict);
      session.notes.unshift('Facultative : à faire seulement si tu te sens bien récupéré.');
      sessions.push(session);
      explanations.push('Séance facultative proposée sur un jour qui ne gêne pas ta récupération.');
    } else {
      explanations.push('Pas de séance facultative cette semaine : aucun jour restant ne laisse assez de récupération.');
    }
  }

  sessions.sort((a, b) => a.date.localeCompare(b.date));
  const lastCore = [...sessions].reverse().find((session) => !session.optional);
  return {
    status: count < coreOrder.length ? 'reduced' : 'ok',
    sessions,
    explanations,
    excludedDays,
    lastCoreKey: lastCore?.templateKey ?? null,
  };
}

function buildSession(day: DayContext, template: SessionTemplate, optional: boolean, slot: TimeSlot): PlannedGymSession {
  const notes = [...slot.notes];
  let light = false;
  if (day.fatigue) {
    light = true;
    notes.push('Fatigue déclarée ce jour-là : version allégée conseillée.');
  }
  if (day.matchYesterday) {
    if ((day.matchYesterday.intensity ?? 0) >= PLANNER_RULES.intenseMatch) {
      light = true;
      notes.push(`Match intense la veille (${day.matchYesterday.intensity}/10) : version allégée conseillée.`);
    } else {
      notes.push('Lendemain de match : écoute ta récupération.');
    }
  }
  if (day.practice) notes.push('Entraînement de basket le même jour : garde une pause entre les deux.');
  return {
    date: day.date,
    templateKey: template.key,
    optional,
    startTime: slot.startTime,
    availableMinutes: slot.availableMinutes,
    light,
    notes,
  };
}

export { dayLabel };
