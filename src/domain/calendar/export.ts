import type { IsoDate } from '../common/dates';
import { exerciseName } from '../training/exercises';
import { estimateMinutes } from '../training/program';
import type { Program } from '../training/types';
import type { IcsEvent } from './ics';
import type { Occurrence, PlannedGymSession } from './types';

interface ExportInput {
  sessions: readonly PlannedGymSession[];
  occurrences: readonly Occurrence[];
  program: Program | null;
  /** Rien n'est exporté avant cette date (pas d'événement passé). */
  from: IsoDate;
  includeBasketball: boolean;
  alarmMinutes: number | null;
}

/** Identifiant stable et sans caractère spécial (même événement → même UID à chaque export). */
const uid = (value: string) => `${value.replace(/[^A-Za-z0-9-]/g, '-')}@vyro.app`;

export function buildExportEvents({ sessions, occurrences, program, from, includeBasketball, alarmMinutes }: ExportInput): IcsEvent[] {
  const events: IcsEvent[] = [];
  for (const session of sessions) {
    if (session.date < from) continue;
    const template = program?.templates.find((item) => item.key === session.templateKey);
    const minutes = session.availableMinutes ?? (template ? estimateMinutes(template.slots) : 60);
    const exercises = template?.slots.map((slot) => `• ${exerciseName(slot.exerciseId)} : ${slot.sets} × ${slot.repMin}–${slot.repMax}`) ?? [];
    events.push({
      uid: uid(`vyro-muscu-${session.date}-${session.templateKey}`),
      date: session.date,
      startTime: session.startTime,
      durationMinutes: minutes,
      summary: `VYRO — Séance ${session.templateKey}${session.optional ? ' (facultative)' : ''}${session.light ? ' (allégée)' : ''}`,
      description: [template?.focus ?? '', ...exercises, '', ...session.notes, 'Charges et séries à noter dans VYRO.'].filter((line, i, all) => line || all[i - 1]).join('\n').trim(),
      alarmMinutes,
    });
  }
  if (includeBasketball) {
    for (const occurrence of occurrences) {
      if (occurrence.suspended || occurrence.kind === 'other' || occurrence.date < from) continue;
      events.push({
        uid: uid(`vyro-${occurrence.id}`),
        date: occurrence.date,
        startTime: occurrence.startTime,
        durationMinutes: occurrence.durationMinutes ?? 90,
        summary: `🏀 ${occurrence.title}`,
        description: occurrence.movedFrom ? `Reporté du ${occurrence.movedFrom}.` : '',
        alarmMinutes,
      });
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? '').localeCompare(b.startTime ?? ''));
}
