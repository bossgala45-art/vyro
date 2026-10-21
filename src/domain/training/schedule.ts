import { toIsoDate, type IsoDate } from '../common/dates';
import type { Program, TemplateKey, Weekday } from './types';

/** Outils de semaine et de rotation des séances, et conseil avant séance. */

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: 'Lundi',
  1: 'Mardi',
  2: 'Mercredi',
  3: 'Jeudi',
  4: 'Vendredi',
  5: 'Samedi',
  6: 'Dimanche',
};

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
 * État des séances prévues. Une séance faite un autre jour que prévu compte comme faite.
 * Une séance manquée n'est ni rattrapée ni compensée : la rotation reprend simplement.
 */
export function weekStatuses(
  sessions: readonly { date: IsoDate; templateKey: TemplateKey }[],
  today: IsoDate,
  completed: readonly { date: IsoDate; templateKey: TemplateKey }[],
): Map<IsoDate, DayStatus> {
  const remaining = [...completed].sort((a, b) => a.date.localeCompare(b.date));
  const statuses = new Map<IsoDate, DayStatus>();
  for (const session of [...sessions].sort((a, b) => a.date.localeCompare(b.date))) {
    const matchIndex = remaining.findIndex((workout) => workout.templateKey === session.templateKey);
    if (matchIndex !== -1) {
      remaining.splice(matchIndex, 1);
      statuses.set(session.date, 'done');
    } else {
      statuses.set(session.date, session.date < today ? 'missed' : session.date === today ? 'today' : 'upcoming');
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
