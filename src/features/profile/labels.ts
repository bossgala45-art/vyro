import type { Equipment, ExperienceLevel, GoalType, Sex } from '../../domain/profile/types';

export const SEX_LABELS: Record<Sex, string> = {
  male: 'Homme',
  female: 'Femme',
  unspecified: 'Non précisé',
};

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  none: 'Jamais pratiqué',
  lt3m: 'Moins de 3 mois',
  '3to6m': '3 à 6 mois',
  '6to12m': '6 à 12 mois',
  '1to2y': '1 à 2 ans',
  gt2y: 'Plus de 2 ans',
};

export const GOAL_LABELS: Record<GoalType, { label: string; description: string }> = {
  athletic: { label: 'Physique athlétique', description: 'Mince, tonique et musclé' },
  muscle: { label: 'Prise de muscle', description: 'Gagner du volume musculaire' },
  strength: { label: 'Force', description: 'Devenir plus fort' },
  basketball: { label: 'Performance basket', description: 'Explosivité, endurance' },
  fitness: { label: 'Forme générale', description: 'Santé et régularité' },
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  dumbbells: 'Haltères',
  bench: 'Banc',
  barbell: 'Barre',
  plates: 'Poids / disques',
  cables: 'Poulies',
  machines: 'Machines',
  pullupBar: 'Barre de traction',
  kettlebells: 'Kettlebells',
  bands: 'Élastiques',
};

export function toOptions<T extends string>(labels: Record<T, string>) {
  return (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));
}

const longDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export function formatLongDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  return longDate.format(new Date(y, m - 1, d));
}
