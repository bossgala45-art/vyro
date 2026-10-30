import type { IsoDate } from '../common/dates';
import type { PlannedGymSession, PlanSnapshot } from './types';

export interface PlanChange {
  kind: 'moved' | 'added' | 'removed' | 'time' | 'light';
  templateKey: string;
  message: string;
}

type Snap = PlanSnapshot['sessions'][number];

const label = (session: Pick<Snap, 'templateKey' | 'optional'>) =>
  `Séance ${session.templateKey}${session.optional ? ' (facultative)' : ''}`;

/**
 * Compare le dernier planning vu par l'utilisateur au planning recalculé.
 * Les séances sont associées par séance type, dans l'ordre chronologique.
 * @param describeDate formate une date (ex. « jeudi 22 octobre »)
 * @param reasonFor raison pour laquelle une date n'est plus utilisée (jour exclu)
 */
export function diffPlans(
  previous: readonly Snap[],
  current: readonly PlannedGymSession[],
  describeDate: (date: IsoDate) => string,
  reasonFor: (date: IsoDate) => string | undefined,
): PlanChange[] {
  const changes: PlanChange[] = [];
  const key = (session: Pick<Snap, 'templateKey' | 'optional'>) => `${session.templateKey}|${session.optional}`;
  const remaining = [...current].sort((a, b) => a.date.localeCompare(b.date));

  for (const old of [...previous].sort((a, b) => a.date.localeCompare(b.date))) {
    const index = remaining.findIndex((session) => key(session) === key(old));
    const reason = reasonFor(old.date);
    if (index === -1) {
      changes.push({
        kind: 'removed',
        templateKey: old.templateKey,
        message: `${label(old)} du ${describeDate(old.date)} retirée${reason ? ` : ${reason}` : ''}.`,
      });
      continue;
    }
    const [now] = remaining.splice(index, 1);
    if (!now) continue;
    if (now.date !== old.date) {
      changes.push({
        kind: 'moved',
        templateKey: old.templateKey,
        message: `${label(old)} déplacée du ${describeDate(old.date)} au ${describeDate(now.date)}${reason ? ` (${reason})` : ''}.`,
      });
    } else if (now.startTime !== old.startTime) {
      changes.push({
        kind: 'time',
        templateKey: old.templateKey,
        message: `${label(old)} du ${describeDate(now.date)} : horaire ${old.startTime ?? 'libre'} → ${now.startTime ?? 'libre'}.`,
      });
    }
    if (now.light && !old.light) {
      changes.push({
        kind: 'light',
        templateKey: now.templateKey,
        message: `${label(now)} du ${describeDate(now.date)} : version allégée conseillée. ${now.notes.find((note) => note.includes('allégée')) ?? ''}`.trim(),
      });
    }
  }
  for (const added of remaining) {
    changes.push({ kind: 'added', templateKey: added.templateKey, message: `${label(added)} ajoutée le ${describeDate(added.date)}.` });
  }
  return changes;
}

export function toSnapshot(weekStart: IsoDate, sessions: readonly PlannedGymSession[], now: string): PlanSnapshot {
  return {
    weekStart,
    sessions: sessions.map(({ date, templateKey, optional, startTime, light }) => ({ date, templateKey, optional, startTime, light })),
    acknowledgedAt: now,
  };
}
