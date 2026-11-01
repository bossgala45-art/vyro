import type { IsoDate } from '../common/dates';
import { daysBetween } from '../common/dates';
import type { PhotoPose, ProgressPhoto } from './types';

/** Mois (AAAA-MM) d'une date. */
export const monthOf = (date: IsoDate) => date.slice(0, 7);

export interface PhotoMonth {
  month: string;
  photos: ProgressPhoto[];
}

/** Chronologie : mois du plus récent au plus ancien, photos triées par date puis pose. */
export function groupByMonth(photos: readonly ProgressPhoto[]): PhotoMonth[] {
  const months = new Map<string, ProgressPhoto[]>();
  const sorted = [...photos].sort((a, b) => b.date.localeCompare(a.date) || a.createdAt.localeCompare(b.createdAt));
  for (const photo of sorted) {
    const month = monthOf(photo.date);
    months.set(month, [...(months.get(month) ?? []), photo]);
  }
  return [...months.entries()].map(([month, items]) => ({ month, photos: items }));
}

/** Photo du mois en cours déjà prise pour cette pose ? (rappel mensuel affiché dans l'app) */
export function monthlyStatus(photos: readonly ProgressPhoto[], today: IsoDate): { done: boolean; lastDate: IsoDate | null } {
  const sorted = [...photos].sort((a, b) => b.date.localeCompare(a.date));
  return { done: sorted.some((photo) => monthOf(photo.date) === monthOf(today)), lastDate: sorted[0]?.date ?? null };
}

/** Avant / après par défaut : la plus ancienne et la plus récente photo de la pose. */
export function defaultComparison(photos: readonly ProgressPhoto[], pose: PhotoPose): { before: ProgressPhoto; after: ProgressPhoto } | null {
  const sorted = photos.filter((photo) => photo.pose === pose).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const before = sorted[0];
  const after = sorted[sorted.length - 1];
  return before && after && before.id !== after.id ? { before, after } : null;
}

export function elapsedDays(before: ProgressPhoto, after: ProgressPhoto): number {
  return daysBetween(before.date, after.date);
}

/** Dernière photo d'une pose : affichée comme repère pour reproduire le même cadrage. */
export function lastPhotoOfPose(photos: readonly ProgressPhoto[], pose: PhotoPose): ProgressPhoto | null {
  return [...photos].filter((photo) => photo.pose === pose).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

export const PHOTO_TIPS: readonly string[] = [
  'Même moment : idéalement le matin, avant de manger, une fois par mois.',
  'Même lumière : face à une fenêtre ou sous le même éclairage, sans contre-jour.',
  'Même endroit et même fond, uni si possible.',
  'Même distance et même hauteur : iPhone posé à hauteur de poitrine, avec le minuteur.',
  'Même tenue et même posture : bras le long du corps, relâché, sans contracter.',
  'Les trois poses (face, profil, dos) permettent de comparer ce qui change vraiment.',
];
