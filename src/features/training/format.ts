import { getExercise } from '../../domain/training/exercises';
import type { Weekday } from '../../domain/training/types';

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  0: 'Lun',
  1: 'Mar',
  2: 'Mer',
  3: 'Jeu',
  4: 'Ven',
  5: 'Sam',
  6: 'Dim',
};

export function formatKg(kg: number): string {
  return `${kg.toLocaleString('fr-FR')} kg`;
}

/** « 20 kg par haltère », « 40 kg » ou « charge à déterminer ». */
export function formatLoad(exerciseId: string, loadKg: number | null): string {
  const exercise = getExercise(exerciseId);
  if (exercise?.loadType === 'bodyweight') return 'poids du corps';
  if (loadKg === null) return 'charge à déterminer';
  return `${formatKg(loadKg)}${exercise?.loadPerHand ? ' par haltère' : ''}`;
}

export function formatRest(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest}`;
}

export function formatReps(repMin: number, repMax: number): string {
  return repMin === repMax ? `${repMin}` : `${repMin}–${repMax}`;
}

/** Lit un nombre saisi au clavier français ; `null` si vide ou invalide. */
export function parseNumber(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(normalized)) return null;
  return Number(normalized);
}

const shortDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  const text = shortDate.format(new Date(y, m - 1, d));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function newId(): string {
  return crypto.randomUUID();
}
