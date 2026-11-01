import { fromMinutes, toMinutes } from '../calendar/time';
import type { LocalTime } from '../calendar/types';
import type { FoodPreferences } from '../profile/types';
import { FOODS, indexPreferences, type Food } from './foods';
import type { IdeaMoment } from './meals';

/** Sport du jour, tiré du calendrier et du planning de musculation. */
export interface NutritionDay {
  match: { startTime: LocalTime | null } | null;
  /** Entraînements de basket du jour. */
  practices: { startTime: LocalTime | null }[];
  /** Séance de musculation prévue ou faite aujourd'hui. */
  gym: { startTime: LocalTime | null } | null;
  matchTomorrow: boolean;
}

export interface DayTip {
  title: string;
  text: string;
}

export interface DayAdvice {
  /** Nombre de séances de sport du jour (match, entraînements, musculation). */
  sportSessions: number;
  kind: 'match' | 'sport' | 'rest';
  tips: DayTip[];
  /** Moments à mettre en avant dans les idées de repas. */
  moments: IdeaMoment[];
}

const before = (time: LocalTime | null, minutes: number): string =>
  time && toMinutes(time) >= minutes ? ` (vers ${fromMinutes(toMinutes(time) - minutes).replace(':', ' h ')})` : '';

/**
 * Conseils généraux adaptés au sport du jour. Ils restent prudents : jamais de restriction,
 * jamais de quantité imposée.
 */
export function adviseDay(day: NutritionDay, { breakfastOftenSkipped = false } = {}): DayAdvice {
  const sportSessions = (day.match ? 1 : 0) + day.practices.length + (day.gym ? 1 : 0);
  const tips: DayTip[] = [];
  const moments: IdeaMoment[] = [];
  const morning = [day.match, day.gym, ...day.practices].some((item) => item?.startTime && toMinutes(item.startTime) < 12 * 60);

  if (day.match) {
    moments.push('pre-sport', 'post-sport');
    tips.push(
      {
        title: 'Avant le match',
        text: `Un repas habituel, avec des féculents et facile à digérer, environ 3 h avant${before(day.match.startTime, 180)}. Ce n’est pas le jour pour tester un aliment nouveau.`,
      },
      { title: 'Pendant la journée', text: 'Bois régulièrement et emporte une gourde au match.' },
      { title: 'Après le match', text: 'Un vrai repas avec des féculents et une source de protéines pour récupérer.' },
    );
  }
  if (day.practices.length > 0) {
    if (!day.match) moments.push('pre-sport');
    const first = day.practices[0]?.startTime ?? null;
    tips.push({
      title: 'Entraînement de basket',
      text: `Si ton dernier repas date de plus de 3 h, prends une collation 1 h à 1 h 30 avant${before(first, 75)}. Emporte une gourde.`,
    });
  }
  if (day.gym) {
    if (!moments.includes('post-sport')) moments.push('post-sport');
    tips.push({
      title: 'Après la musculation',
      text: 'Un repas ou une collation avec une source de protéines dans les deux heures qui suivent.',
    });
  }
  if (day.matchTomorrow) {
    tips.push({ title: 'Veille de match', text: 'Dîner habituel avec des féculents. Inutile de manger beaucoup plus que d’habitude.' });
  }
  if (sportSessions === 0) {
    tips.push({
      title: 'Jour sans sport',
      text: 'Garde tes repas habituels : ton corps récupère et progresse aussi les jours de repos.',
    });
  }
  if (breakfastOftenSkipped && morning) {
    tips.push({
      title: 'Petit-déjeuner',
      text: 'Tu as du sport ce matin et tu sautes souvent le petit-déjeuner : même un fruit et un laitage aident à tenir.',
    });
  }
  tips.push({ title: 'Sans compter', text: 'Vise une source de protéines et des féculents à chaque repas, et un fruit ou un légume quand c’est possible.' });

  return { sportSessions, kind: day.match ? 'match' : sportSessions > 0 ? 'sport' : 'rest', tips, moments };
}

export interface ProteinGuide {
  /** Fourchette indicative en g/jour, ou `null` sans poids enregistré. */
  range: { min: number; max: number } | null;
  /** Sources de protéines bon marché, aimées d'abord, refusées exclues. */
  sources: Food[];
}

/**
 * Repère général pour les sportifs : 1,2 à 2 g de protéines par kg et par jour
 * (prise de position ACSM, Academy of Nutrition and Dietetics et Dietitians of Canada, 2016).
 * Il est affiché à titre indicatif : VYRO ne compte pas les apports.
 */
export const PROTEIN_G_PER_KG = { min: 1.2, max: 2 } as const;

export function proteinGuide(weightKg: number | null, preferences: FoodPreferences): ProteinGuide {
  const index = indexPreferences(preferences);
  const sources = FOODS.filter((item) => item.proteinSource && index.status(item.id) !== 'refused')
    .map((item, order) => ({ item, order }))
    .sort((a, b) => Number(index.status(b.item.id) === 'liked') - Number(index.status(a.item.id) === 'liked') || a.order - b.order)
    .map(({ item }) => item);
  const range =
    weightKg !== null && weightKg > 0
      ? { min: Math.round(weightKg * PROTEIN_G_PER_KG.min), max: Math.round(weightKg * PROTEIN_G_PER_KG.max) }
      : null;
  return { range, sources };
}
