import { addDays } from '../calendar/time';
import type { IsoDate } from '../common/dates';
import { daysBetween } from '../common/dates';
import type { BodyWeightEntry } from '../profile/types';
import type { MeasurementEntry, MeasurementKey } from './types';

export type MetricKey = 'weight' | MeasurementKey;

export interface Point {
  date: IsoDate;
  value: number;
}

/** Points réellement mesurés, du plus ancien au plus récent (une valeur par date). */
export function weightSeries(weights: readonly BodyWeightEntry[]): Point[] {
  const byDate = new Map<IsoDate, BodyWeightEntry>();
  for (const entry of weights) {
    const current = byDate.get(entry.date);
    // Plusieurs pesées le même jour : la dernière saisie fait foi.
    if (!current || entry.createdAt > current.createdAt) byDate.set(entry.date, entry);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).map((entry) => ({ date: entry.date, value: entry.kg }));
}

export function measurementSeries(entries: readonly MeasurementEntry[], key: MeasurementKey): Point[] {
  return entries
    .flatMap((entry) => {
      const value = entry[key];
      return value === null ? [] : [{ date: entry.date, value }];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const RANGES = ['1m', '3m', '6m', 'all'] as const;
export type Range = (typeof RANGES)[number];

const RANGE_DAYS: Record<Exclude<Range, 'all'>, number> = { '1m': 31, '3m': 92, '6m': 183 };

export function inRange(points: readonly Point[], range: Range, today: IsoDate): Point[] {
  if (range === 'all') return [...points];
  const from = addDays(today, -RANGE_DAYS[range]);
  return points.filter((point) => point.date >= from && point.date <= today);
}

export interface Change {
  from: Point;
  to: Point;
  delta: number;
  days: number;
}

/**
 * Évolution mesurée entre le premier et le dernier point de la période.
 * `null` s'il y a moins de deux mesures : aucune tendance n'est inventée.
 */
export function measuredChange(points: readonly Point[]): Change | null {
  const from = points[0];
  const to = points[points.length - 1];
  if (!from || !to || points.length < 2) return null;
  return { from, to, delta: Math.round((to.value - from.value) * 10) / 10, days: daysBetween(from.date, to.date) };
}

/**
 * Mesure la plus proche d'une date, à `maxDays` jours au plus. Sert à la comparaison
 * de photos : sans mesure assez proche, rien n'est affiché.
 */
export function nearestPoint(points: readonly Point[], date: IsoDate, maxDays = 7): Point | null {
  let best: Point | null = null;
  for (const point of points) {
    const gap = Math.abs(daysBetween(point.date, date));
    if (gap > maxDays) continue;
    if (!best || gap < Math.abs(daysBetween(best.date, date))) best = point;
  }
  return best;
}
