import type { IdeaMoment } from '../../domain/nutrition/meals';
import type { MealSlot, PortionSize } from '../../domain/nutrition/types';

export const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  snack: 'Collation',
  dinner: 'Dîner',
};

export const PORTION_LABELS: Record<PortionSize, string> = {
  small: 'Petite',
  normal: 'Normale',
  large: 'Grande',
};

export const MOMENT_LABELS: Record<IdeaMoment, string> = {
  breakfast: 'Petit-déj',
  meal: 'Repas',
  snack: 'Collation',
  'pre-sport': 'Avant le sport',
  'post-sport': 'Après le sport',
};

export const NUTRITION_DISCLAIMER =
  'Conseils généraux et prudents, pas un avis médical ni diététique. VYRO ne compte pas les calories et ne calcule aucun apport.';

export function formatMl(ml: number): string {
  return `${ml.toLocaleString('fr-FR')} ml`;
}

export function formatTime(time: string): string {
  return time.replace(':', ' h ');
}
