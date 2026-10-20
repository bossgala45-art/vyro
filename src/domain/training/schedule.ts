import { toIsoDate, type IsoDate } from '../common/dates';
import { templateLegDemand } from './program';
import { WEEKDAYS, type Program, type TemplateKey, type Weekday, type WeeklyRoutine } from './types';

/**
 * Placement des séances dans la semaine, autour du basket.
 *
 * Règles strictes :
 * - uniquement sur un jour déclaré disponible pour la salle ;
 * - jamais le jour d'un match ;
 * - jamais de séance avec du travail de jambes la veille d'un match.
 * Préférences (pénalités) :
 * - éviter deux jours de salle consécutifs (48 h entre deux séances) ;
 * - éviter le lendemain d'un match et les jours d'entraînement de basket ;
 * - la 3e séance (facultative) n'est placée que si un jour reste vraiment adapté.
 * Sans disponibilités déclarées, rien n'est planifié.
 */

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: 'Lundi',
  1: 'Mardi',
  2: 'Mercredi',
  3: 'Jeudi',
  4: 'Vendredi',
  5: 'Samedi',
  6: 'Dimanche',
};

export const SCHEDULE_PENALTIES = {
  consecutiveGymDays: 5,
  dayAfterMatch: 3,
  practiceSameDay: 2,
  /** Au-delà, la 3e séance facultative n'est pas proposée. */
  maxOptionalPenalty: 2,
} as const;

export interface PlannedSession {
  weekday: Weekday;
  templateKey: TemplateKey;
  optional: boolean;
  /** Remarques sur ce jour (entraînement de basket le même jour…). */
  notes: string[];
}

export type WeekPlanStatus = 'ok' | 'unknown-availability' | 'no-valid-day' | 'reduced';

export interface WeekPlan {
  status: WeekPlanStatus;
  sessions: PlannedSession[];
  explanations: string[];
}

const prev = (day: Weekday) => ((day + 6) % 7) as Weekday;
const next = (day: Weekday) => ((day + 1) % 7) as Weekday;

export function weekdayOf(date: IsoDate): Weekday {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return ((new Date(y, m - 1, d).getDay() + 6) % 7) as Weekday;
}

/** Lundi de la semaine contenant `date`. */
export function weekStart(date: IsoDate): IsoDate {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const day = new Date(y, m - 1, d);
  day.setDate(day.getDate() - weekdayOf(date));
  return toIsoDate(day);
}

export function dateOfWeekday(monday: IsoDate, weekday: Weekday): IsoDate {
  const [y, m, d] = monday.split('-').map(Number) as [number, number, number];
  return toIsoDate(new Date(y, m - 1, d + weekday));
}

function combinations<T>(items: readonly T[], size: number): T[][] {
  if (size === 0) return [[]];
  return items.flatMap((item, index) => combinations(items.slice(index + 1), size - 1).map((rest) => [item, ...rest]));
}

interface PlanInput {
  routine: Pick<WeeklyRoutine, 'gymDays' | 'practiceDays' | 'matchDays' | 'includeOptionalThird'>;
  program: Program;
  /** Séance principale à faire en premier (rotation A/B). */
  nextCoreKey: TemplateKey;
  /**
   * Premier jour planifiable de la semaine (programme créé en cours de semaine) :
   * les jours précédents ne sont ni planifiés ni comptés comme manqués.
   */
  firstDay?: Weekday;
}

export function planWeek({ routine, program, nextCoreKey, firstDay = 0 }: PlanInput): WeekPlan {
  const explanations: string[] = [];
  if (firstDay > 0) explanations.push('Programme commencé en cours de semaine : planning à partir de ce jour seulement.');
  if (routine.gymDays.length === 0) {
    return {
      status: 'unknown-availability',
      sessions: [],
      explanations: ['Indique tes jours disponibles pour la salle : VYRO ne planifie rien sans connaître tes disponibilités.'],
    };
  }

  const isMatch = (day: Weekday) => routine.matchDays.includes(day);
  const isPractice = (day: Weekday) => routine.practiceDays.includes(day);
  const coreTemplates = program.templates.filter((template) => !template.optional);
  const optional = program.templates.find((template) => template.optional);
  const coreOrder = [...coreTemplates].sort((a, b) =>
    a.key === nextCoreKey ? -1 : b.key === nextCoreKey ? 1 : a.key.localeCompare(b.key),
  );
  const hasLegs = (key: TemplateKey) => {
    const template = program.templates.find((item) => item.key === key);
    return template ? templateLegDemand(template) !== 'none' && templateLegDemand(template) !== 'low' : false;
  };

  const allowed = (day: Weekday, key: TemplateKey) =>
    day >= firstDay &&
    routine.gymDays.includes(day) && !isMatch(day) && !(hasLegs(key) && isMatch(next(day)));

  const dayPenalty = (day: Weekday) =>
    (isMatch(prev(day)) ? SCHEDULE_PENALTIES.dayAfterMatch : 0) + (isPractice(day) ? SCHEDULE_PENALTIES.practiceSameDay : 0);

  const spacingPenalty = (days: readonly Weekday[]) =>
    days.reduce<number>((total, day) => total + (days.includes(next(day)) ? SCHEDULE_PENALTIES.consecutiveGymDays : 0), 0);

  // Séances principales : meilleure combinaison de jours (rotation dans l'ordre chronologique).
  const bestDays = (count: number): { days: Weekday[]; score: number } | null => {
    let found: { days: Weekday[]; score: number } | null = null;
    for (const days of combinations(WEEKDAYS, count)) {
      if (!days.every((day, index) => allowed(day, coreOrder[index]?.key ?? 'A'))) continue;
      const score = days.reduce<number>((total, day) => total + dayPenalty(day), 0) + spacingPenalty(days);
      if (!found || score < found.score) found = { days, score };
    }
    return found;
  };

  // Moins de séances si la semaine ne le permet pas — jamais de séance plus lourde pour compenser.
  let coreCount = coreOrder.length;
  let best = bestDays(coreCount);
  while (!best && coreCount > 1) {
    coreCount -= 1;
    best = bestDays(coreCount);
  }

  if (!best) {
    return {
      status: 'no-valid-day',
      sessions: [],
      explanations: [
        ...explanations,
        'Aucun jour disponible ne convient cette semaine (jours de match ou veilles de match uniquement). Ajoute un jour disponible ou garde la semaine pour le basket.',
      ],
    };
  }

  const sessions: PlannedSession[] = best.days.map((day, index) => {
    const key = coreOrder[index]?.key ?? 'A';
    const notes: string[] = [];
    if (isPractice(day)) notes.push('Entraînement de basket le même jour : fais la musculation après une pause, ou allège.');
    if (isMatch(prev(day))) notes.push('Lendemain de match : écoute ta récupération, la version allégée est possible.');
    return { weekday: day, templateKey: key, optional: false, notes };
  });

  explanations.push(
    `${sessions.length} séance${sessions.length > 1 ? 's' : ''} principale${sessions.length > 1 ? 's' : ''} placée${sessions.length > 1 ? 's' : ''} sur tes jours disponibles, jamais un jour de match.`,
  );
  if (routine.matchDays.length > 0) explanations.push('Pas de séance avec travail de jambes la veille d’un match.');
  if (spacingPenalty(best.days) === 0 && sessions.length > 1) explanations.push('Au moins 48 h entre deux séances de musculation.');
  if (coreCount < coreOrder.length) {
    explanations.push(
      `Une seule séance possible cette semaine avec tes disponibilités : pas de rattrapage ni de séance plus lourde pour compenser.`,
    );
  }

  // 3e séance facultative.
  if (routine.includeOptionalThird && optional && coreCount === coreOrder.length) {
    const used = sessions.map((session) => session.weekday);
    const candidates = WEEKDAYS.filter((day) => !used.includes(day) && allowed(day, optional.key))
      .map((day) => ({ day, score: dayPenalty(day) + spacingPenalty([...used, day]) - spacingPenalty(used) }))
      .filter((candidate) => candidate.score <= SCHEDULE_PENALTIES.maxOptionalPenalty)
      .sort((a, b) => a.score - b.score || a.day - b.day);
    const chosen = candidates[0];
    if (chosen) {
      sessions.push({
        weekday: chosen.day,
        templateKey: optional.key,
        optional: true,
        notes: ['Facultative : à faire seulement si tu te sens bien récupéré.'],
      });
      explanations.push('Séance facultative proposée sur un jour qui ne gêne pas ta récupération.');
    } else {
      explanations.push('Pas de 3e séance cette semaine : aucun jour restant ne laisse assez de récupération.');
    }
  }

  sessions.sort((a, b) => a.weekday - b.weekday);
  return { status: coreCount < coreOrder.length ? 'reduced' : 'ok', sessions, explanations };
}

/** Séance principale suivante dans la rotation (A puis B puis A…), d'après la dernière faite. */
export function nextCoreTemplate(program: Program, lastCompletedCoreKey: TemplateKey | null): TemplateKey {
  const core = program.templates.filter((template) => !template.optional).map((template) => template.key);
  if (core.length === 0) return 'A';
  if (!lastCompletedCoreKey) return core[0] ?? 'A';
  const index = core.indexOf(lastCompletedCoreKey);
  return core[(index + 1) % core.length] ?? 'A';
}

export type DayStatus = 'done' | 'missed' | 'today' | 'upcoming';

/**
 * État des séances prévues de la semaine. Une séance faite un autre jour que prévu compte
 * comme faite. Une séance manquée n'est ni rattrapée ni compensée : la rotation reprend
 * simplement à la séance suivante.
 */
export function weekStatuses(
  sessions: readonly PlannedSession[],
  monday: IsoDate,
  today: IsoDate,
  completedThisWeek: readonly { date: IsoDate; templateKey: TemplateKey }[],
): Map<Weekday, DayStatus> {
  const remaining = [...completedThisWeek].sort((a, b) => a.date.localeCompare(b.date));
  const statuses = new Map<Weekday, DayStatus>();
  for (const session of [...sessions].sort((a, b) => a.weekday - b.weekday)) {
    const date = dateOfWeekday(monday, session.weekday);
    const matchIndex = remaining.findIndex((workout) => workout.templateKey === session.templateKey);
    if (matchIndex !== -1) {
      remaining.splice(matchIndex, 1);
      statuses.set(session.weekday, 'done');
    } else {
      statuses.set(session.weekday, date < today ? 'missed' : date === today ? 'today' : 'upcoming');
    }
  }
  return statuses;
}

export interface SessionAdvice {
  mode: 'normal' | 'light' | 'rest';
  reasons: string[];
}

/**
 * Conseil avant de commencer une séance. VYRO n'impose jamais de séance intense :
 * en cas de doute, la version allégée ou le repos sont proposés.
 */
export function adviseSession(input: {
  isMatchDay: boolean;
  isDayBeforeMatch: boolean;
  legSession: boolean;
  feeling: 'good' | 'tired' | 'pain' | 'unknown';
}): SessionAdvice {
  const reasons: string[] = [];
  let mode: SessionAdvice['mode'] = 'normal';
  if (input.feeling === 'pain') {
    mode = 'rest';
    reasons.push('Douleur inhabituelle : repos conseillé. Si elle persiste, demande l’avis d’un professionnel de santé.');
  }
  if (input.isMatchDay) {
    mode = 'rest';
    reasons.push('Jour de match : pas de musculation, garde ton énergie pour le terrain.');
  }
  if (mode !== 'rest') {
    if (input.isDayBeforeMatch && input.legSession) {
      mode = 'light';
      reasons.push('Match demain : version allégée conseillée pour ne pas arriver avec les jambes lourdes.');
    }
    if (input.feeling === 'tired') {
      mode = 'light';
      reasons.push('Fatigue déclarée : version allégée (une série de moins, pas de hausse de charge).');
    }
  }
  if (mode === 'normal') {
    reasons.push(
      input.feeling === 'good'
        ? 'Tu te sens bien : séance normale.'
        : 'Séance normale. Si tu te sens fatigué, choisis la version allégée.',
    );
  }
  return { mode, reasons };
}
