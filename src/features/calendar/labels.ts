import type { ActivityKind, Occurrence } from '../../domain/calendar/types';
import { toMinutes, fromMinutes } from '../../domain/calendar/time';

export const KIND_LABELS: Record<ActivityKind, string> = {
  practice: 'Entraînement de basket',
  match: 'Match',
  other: 'Autre activité',
};

export const KIND_STYLES: Record<ActivityKind, string> = {
  practice: 'bg-amber-400/15 text-amber-200',
  match: 'bg-orange-500/20 text-orange-200',
  other: 'bg-ink-700 text-mist',
};

/** « 18:00–19:30 », « 18:00 » ou « horaire non précisé ». */
export function formatTimeRange(occurrence: Pick<Occurrence, 'startTime' | 'durationMinutes'>): string {
  if (!occurrence.startTime) return 'horaire non précisé';
  if (!occurrence.durationMinutes) return occurrence.startTime;
  return `${occurrence.startTime}–${fromMinutes(toMinutes(occurrence.startTime) + occurrence.durationMinutes)}`;
}

const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const dayFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

export function formatMonth(isoDate: string): string {
  const [y, m] = isoDate.split('-').map(Number) as [number, number];
  const text = monthFormatter.format(new Date(y, m - 1, 1));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatDayShort(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  return dayFormatter.format(new Date(y, m - 1, d));
}
