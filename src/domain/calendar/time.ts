import { toIsoDate, type IsoDate } from '../common/dates';
import type { LocalTime } from './types';

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isLocalTime(value: string): value is LocalTime {
  return TIME.test(value);
}

/** Minutes depuis minuit. */
export function toMinutes(time: LocalTime): number {
  const [h, m] = time.split(':').map(Number) as [number, number];
  return h * 60 + m;
}

export function fromMinutes(minutes: number): LocalTime {
  const clamped = Math.max(0, Math.min(minutes, 23 * 60 + 59));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return toIsoDate(new Date(y, m - 1, d + days));
}

/** Toutes les dates de `from` à `to` incluses. */
export function dateRange(from: IsoDate, to: IsoDate): IsoDate[] {
  const dates: IsoDate[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return dates;
}

export interface Interval {
  start: number;
  end: number;
}

/** Retire des intervalles occupés d'un intervalle libre ; renvoie les morceaux restants. */
export function subtractIntervals(free: Interval, busy: readonly Interval[]): Interval[] {
  let pieces: Interval[] = [free];
  for (const block of busy) {
    pieces = pieces.flatMap((piece) => {
      if (block.end <= piece.start || block.start >= piece.end) return [piece];
      const parts: Interval[] = [];
      if (block.start > piece.start) parts.push({ start: piece.start, end: block.start });
      if (block.end < piece.end) parts.push({ start: block.end, end: piece.end });
      return parts;
    });
  }
  return pieces;
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}
