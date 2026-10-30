import { addDays, dateRange } from '../calendar/time';
import type { IsoDate } from '../common/dates';
import type { CheckIn, SorenessLevel } from './types';

const SORENESS_VALUE: Record<SorenessLevel, number> = { none: 0, light: 1, moderate: 2, strong: 3 };

export interface HistoryDay {
  date: IsoDate;
  sleepHours: number | null;
  energy: number | null;
  motivation: number | null;
  /** 0 (aucune) à 3 (fortes). */
  soreness: number | null;
  pain: boolean | null;
}

/** Une ligne par jour sur la période ; `null` quand rien n'a été saisi (aucune valeur inventée). */
export function historyDays(checkIns: readonly CheckIn[], today: IsoDate, days: number): HistoryDay[] {
  const byDate = new Map(checkIns.map((checkIn) => [checkIn.date, checkIn]));
  return dateRange(addDays(today, -(days - 1)), today).map((date) => {
    const checkIn = byDate.get(date);
    return {
      date,
      sleepHours: checkIn?.sleepHours ?? null,
      energy: checkIn?.energy ?? null,
      motivation: checkIn?.motivation ?? null,
      soreness: checkIn?.soreness ? SORENESS_VALUE[checkIn.soreness] : null,
      pain: checkIn?.pain ?? null,
    };
  });
}

/** Moyenne des valeurs renseignées seulement ; `null` sans aucune valeur. */
export function averageOf(values: readonly (number | null)[]): { value: number; count: number } | null {
  const known = values.filter((value): value is number => value !== null);
  if (known.length === 0) return null;
  return { value: known.reduce((sum, value) => sum + value, 0) / known.length, count: known.length };
}
