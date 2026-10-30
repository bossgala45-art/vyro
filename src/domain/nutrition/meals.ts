import { getFood, indexPreferences, type FoodPreferenceIndex, type FoodStatus } from './foods';
import type { FoodPreferences } from '../profile/types';

/** Moments pour lesquels VYRO propose des idées. */
export const IDEA_MOMENTS = ['breakfast', 'meal', 'snack', 'pre-sport', 'post-sport'] as const;
export type IdeaMoment = (typeof IDEA_MOMENTS)[number];

interface Component {
  /** Aliments interchangeables, par ordre de préférence par défaut. */
  options: readonly string[];
  /** Élément facultatif : s'il est refusé, le repas est proposé sans lui. */
  optional?: boolean;
}

export interface MealIdea {
  id: string;
  name: string;
  moments: readonly IdeaMoment[];
  components: readonly Component[];
  /** Préparation en quelques mots (aucune quantité imposée). */
  howTo: string;
}

/** Idées de repas simples, avec des aliments bon marché. Aucune quantité n'est imposée. */
export const MEAL_IDEAS: readonly MealIdea[] = [
  {
    id: 'oat-bowl',
    name: 'Bol de flocons d’avoine',
    moments: ['breakfast', 'snack'],
    components: [{ options: ['oats'] }, { options: ['milk', 'yogurt'] }, { options: ['banana', 'apple', 'compote'], optional: true }],
    howTo: 'Flocons dans du lait (froid ou chauffé 1 min), fruit coupé par-dessus.',
  },
  {
    id: 'egg-toast',
    name: 'Œufs et tartines',
    moments: ['breakfast', 'post-sport'],
    components: [{ options: ['eggs'] }, { options: ['bread'] }, { options: ['orange', 'banana', 'apple'], optional: true }],
    howTo: 'Œufs brouillés ou au plat, pain grillé, un fruit à côté.',
  },
  {
    id: 'pb-toast',
    name: 'Tartines beurre de cacahuète',
    moments: ['breakfast', 'snack'],
    components: [{ options: ['bread'] }, { options: ['peanut-butter'] }, { options: ['milk', 'yogurt'], optional: true }, { options: ['banana'], optional: true }],
    howTo: 'Pain, beurre de cacahuète, banane en rondelles ; un verre de lait si tu veux.',
  },
  {
    id: 'dairy-fruit',
    name: 'Laitage et fruit',
    moments: ['breakfast', 'snack', 'post-sport'],
    components: [{ options: ['cottage', 'yogurt'] }, { options: ['banana', 'compote', 'apple'] }, { options: ['oats'], optional: true }],
    howTo: 'Fromage blanc ou yaourt, fruit ou compote, quelques flocons d’avoine pour tenir plus longtemps.',
  },
  {
    id: 'tuna-pasta',
    name: 'Pâtes au thon, sauce tomate',
    moments: ['meal', 'pre-sport'],
    components: [
      { options: ['pasta', 'rice'] },
      { options: ['tuna', 'ham', 'eggs'] },
      { options: ['tomato-sauce'], optional: true },
      { options: ['cheese'], optional: true },
    ],
    howTo: 'Pâtes cuites, thon émietté et sauce tomate chauffés ensemble, fromage râpé.',
  },
  {
    id: 'chicken-rice',
    name: 'Riz, poulet et légumes',
    moments: ['meal', 'post-sport'],
    components: [
      { options: ['rice', 'pasta', 'semolina'] },
      { options: ['chicken', 'turkey', 'eggs'] },
      { options: ['green-beans', 'peas', 'carrots', 'corn'], optional: true },
    ],
    howTo: 'Poulet poêlé, riz, légumes surgelés réchauffés à la poêle avec le poulet.',
  },
  {
    id: 'omelette-potatoes',
    name: 'Omelette et pommes de terre',
    moments: ['meal'],
    components: [{ options: ['eggs'] }, { options: ['potatoes', 'bread'] }, { options: ['cheese'], optional: true }, { options: ['salad', 'tomato-sauce'], optional: true }],
    howTo: 'Pommes de terre cuites à l’eau puis dorées à la poêle, omelette au fromage.',
  },
  {
    id: 'lentil-rice',
    name: 'Lentilles et riz',
    moments: ['meal'],
    components: [{ options: ['lentils', 'chickpeas'] }, { options: ['rice', 'semolina', 'bread'] }, { options: ['carrots', 'tomato-sauce'], optional: true }],
    howTo: 'Lentilles (en boîte ou cuites), carottes en rondelles, riz : très économique.',
  },
  {
    id: 'chili',
    name: 'Chili haricots rouges',
    moments: ['meal'],
    components: [
      { options: ['kidney-beans'] },
      { options: ['minced-beef', 'turkey'], optional: true },
      { options: ['rice', 'tortilla', 'bread'] },
      { options: ['tomato-sauce', 'corn'], optional: true },
    ],
    howTo: 'Viande hachée revenue, haricots rouges et sauce tomate, servi avec du riz.',
  },
  {
    id: 'wrap',
    name: 'Wraps maison',
    moments: ['meal', 'snack'],
    components: [{ options: ['tortilla', 'bread'] }, { options: ['chicken', 'tuna', 'ham', 'eggs'] }, { options: ['cheese'], optional: true }, { options: ['salad', 'carrots', 'corn'], optional: true }],
    howTo: 'Galette roulée avec la garniture : prêt en 5 minutes, facile à emporter.',
  },
  {
    id: 'couscous',
    name: 'Semoule aux pois chiches',
    moments: ['meal'],
    components: [{ options: ['semolina', 'rice'] }, { options: ['chickpeas', 'chicken'] }, { options: ['carrots', 'veg-soup', 'peas'], optional: true }],
    howTo: 'Semoule gonflée à l’eau chaude, pois chiches et carottes chauds par-dessus.',
  },
  {
    id: 'soup-ham',
    name: 'Soupe, pain et jambon',
    moments: ['meal'],
    components: [{ options: ['veg-soup'] }, { options: ['bread'] }, { options: ['ham', 'cheese', 'eggs'] }],
    howTo: 'Soupe (brique ou maison mixée), tartines avec jambon ou fromage : les légumes passent mieux mixés.',
  },
  {
    id: 'sardine-toast',
    name: 'Tartines sardines ou maquereau',
    moments: ['snack', 'meal'],
    components: [{ options: ['bread'] }, { options: ['sardines', 'mackerel', 'tuna'] }, { options: ['tomato-sauce', 'salad'], optional: true }],
    howTo: 'Poisson en boîte écrasé sur du pain : économique et rapide.',
  },
  {
    id: 'pre-sport-rice',
    name: 'Assiette simple avant le sport',
    moments: ['pre-sport'],
    components: [{ options: ['rice', 'pasta', 'semolina'] }, { options: ['ham', 'chicken', 'eggs', 'turkey'] }, { options: ['compote', 'banana'], optional: true }],
    howTo: 'Féculent, viande blanche ou œufs, compote : un repas habituel et digeste, 3 h avant.',
  },
  {
    id: 'pre-sport-snack',
    name: 'Collation avant le sport',
    moments: ['pre-sport', 'snack'],
    components: [{ options: ['banana', 'compote'] }, { options: ['bread', 'oats'], optional: true }],
    howTo: 'Banane ou compote, un peu de pain : facile à digérer, 1 h à 1 h 30 avant.',
  },
  {
    id: 'post-sport-milk',
    name: 'Récup après l’effort',
    moments: ['post-sport', 'snack'],
    components: [{ options: ['milk', 'yogurt', 'cottage'] }, { options: ['banana', 'bread', 'oats'] }],
    howTo: 'Un laitage et un féculent ou un fruit dans l’heure ou les deux heures qui suivent.',
  },
];

export interface IdeaItem {
  foodId: string;
  name: string;
  status: FoodStatus;
}

export interface Suggestion {
  idea: MealIdea;
  items: IdeaItem[];
  /** Éléments facultatifs retirés car refusés. */
  removed: string[];
  /** Aliments aimés présents dans l'idée. */
  liked: string[];
}

/** Meilleure option d'un élément : aimée d'abord, puis neutre ou tolérée ; jamais refusée. */
function pick(component: Component, index: FoodPreferenceIndex): string | null {
  const allowed = component.options.filter((id) => index.status(id) !== 'refused');
  return allowed.find((id) => index.status(id) === 'liked') ?? allowed.find((id) => index.status(id) === 'neutral') ?? allowed[0] ?? null;
}

/** Adapte une idée aux goûts ; `null` si un élément indispensable n'a que des aliments refusés. */
export function adaptIdea(idea: MealIdea, index: FoodPreferenceIndex): Suggestion | null {
  const items: IdeaItem[] = [];
  const removed: string[] = [];
  for (const component of idea.components) {
    const choice = pick(component, index);
    if (choice === null) {
      if (!component.optional) return null;
      const first = component.options[0];
      if (first) removed.push(getFood(first)?.name ?? first);
      continue;
    }
    const item = getFood(choice);
    if (item) items.push({ foodId: item.id, name: item.name, status: index.status(item.id) });
  }
  return { idea, items, removed, liked: items.filter((item) => item.status === 'liked').map((item) => item.name) };
}

/**
 * Idées pour un moment, triées par nombre d'aliments aimés.
 * Garantie : aucun aliment refusé n'apparaît dans les idées renvoyées.
 */
export function suggestMeals(moment: IdeaMoment, preferences: FoodPreferences): { suggestions: Suggestion[]; unrecognized: string[] } {
  const index = indexPreferences(preferences);
  const suggestions = MEAL_IDEAS.filter((idea) => idea.moments.includes(moment))
    .map((idea) => adaptIdea(idea, index))
    .filter((suggestion): suggestion is Suggestion => suggestion !== null)
    .map((suggestion, order) => ({ suggestion, order }))
    .sort((a, b) => b.suggestion.liked.length - a.suggestion.liked.length || a.order - b.order)
    .map(({ suggestion }) => suggestion);
  return { suggestions, unrecognized: index.unrecognized };
}
