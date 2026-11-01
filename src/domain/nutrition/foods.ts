import type { FoodPreferences } from '../profile/types';

export const FOOD_CATEGORIES = ['protein', 'starch', 'fruit', 'vegetable', 'dairy', 'extra'] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export interface Food {
  id: string;
  name: string;
  category: FoodCategory;
  /** Autres façons de l'écrire (singulier, synonymes). */
  aliases: readonly string[];
  /** Familles : refuser « poisson » écarte thon, sardines et maquereau. */
  groups: readonly string[];
  /** Source de protéines intéressante (même si sa catégorie principale est autre). */
  proteinSource: boolean;
}

const food = (
  id: string,
  name: string,
  category: FoodCategory,
  { aliases = [], groups = [], proteinSource = category === 'protein' }: { aliases?: string[]; groups?: string[]; proteinSource?: boolean } = {},
): Food => ({ id, name, category, aliases, groups, proteinSource });

/**
 * Aliments courants et bon marché utilisés par les idées de repas.
 * Aucune valeur nutritionnelle n'est associée : VYRO ne calcule pas d'apports.
 */
export const FOODS: readonly Food[] = [
  food('eggs', 'Œufs', 'protein', { aliases: ['oeuf', 'omelette'] }),
  food('tuna', 'Thon en boîte', 'protein', { aliases: ['thon'], groups: ['poisson'] }),
  food('sardines', 'Sardines', 'protein', { groups: ['poisson'] }),
  food('mackerel', 'Maquereau', 'protein', { groups: ['poisson'] }),
  food('chicken', 'Poulet', 'protein', { aliases: ['blanc de poulet', 'cuisse de poulet'], groups: ['viande', 'volaille'] }),
  food('turkey', 'Dinde', 'protein', { groups: ['viande', 'volaille'] }),
  food('ham', 'Jambon', 'protein', { aliases: ['jambon blanc'], groups: ['viande', 'porc'] }),
  food('minced-beef', 'Steak haché', 'protein', { aliases: ['boeuf hache', 'viande hachee', 'steak'], groups: ['viande', 'boeuf'] }),
  food('lentils', 'Lentilles', 'protein', { groups: ['legumineuse', 'legume sec'] }),
  food('chickpeas', 'Pois chiches', 'protein', { aliases: ['pois chiche'], groups: ['legumineuse', 'legume sec'] }),
  food('kidney-beans', 'Haricots rouges', 'protein', { groups: ['legumineuse', 'legume sec'] }),
  food('cottage', 'Fromage blanc', 'dairy', { proteinSource: true, groups: ['laitage', 'produit laitier'] }),
  food('yogurt', 'Yaourt', 'dairy', { aliases: ['yogourt', 'yoghourt'], proteinSource: true, groups: ['laitage', 'produit laitier'] }),
  food('milk', 'Lait', 'dairy', { proteinSource: true, groups: ['laitage', 'produit laitier'] }),
  food('cheese', 'Fromage râpé', 'dairy', { aliases: ['fromage', 'emmental', 'gruyere'], proteinSource: true, groups: ['laitage', 'produit laitier'] }),
  food('pasta', 'Pâtes', 'starch', { aliases: ['spaghetti', 'coquillettes'], groups: ['feculent'] }),
  food('rice', 'Riz', 'starch', { groups: ['feculent'] }),
  food('potatoes', 'Pommes de terre', 'starch', { aliases: ['pomme de terre', 'patate', 'puree'], groups: ['feculent'] }),
  food('bread', 'Pain', 'starch', { aliases: ['baguette', 'pain de mie', 'tartine'], groups: ['feculent'] }),
  food('oats', 'Flocons d’avoine', 'starch', { aliases: ['avoine', 'flocon d avoine', 'porridge'], groups: ['feculent'] }),
  food('semolina', 'Semoule', 'starch', { aliases: ['couscous'], groups: ['feculent'] }),
  food('tortilla', 'Galettes de blé', 'starch', { aliases: ['wrap', 'tortilla'], groups: ['feculent'] }),
  food('banana', 'Banane', 'fruit', { groups: ['fruit'] }),
  food('apple', 'Pomme', 'fruit', { groups: ['fruit'] }),
  food('compote', 'Compote', 'fruit', { aliases: ['compote de pomme'], groups: ['fruit'] }),
  food('orange', 'Orange', 'fruit', { aliases: ['clementine', 'mandarine'], groups: ['fruit', 'agrume'] }),
  food('tomato-sauce', 'Sauce tomate', 'vegetable', { aliases: ['coulis de tomate', 'tomate'], groups: ['legume'] }),
  food('carrots', 'Carottes', 'vegetable', { aliases: ['carotte rapee'], groups: ['legume'] }),
  food('green-beans', 'Haricots verts', 'vegetable', { groups: ['legume'] }),
  food('peas', 'Petits pois', 'vegetable', { aliases: ['petit pois'], groups: ['legume'] }),
  food('corn', 'Maïs', 'vegetable', { groups: ['legume'] }),
  food('veg-soup', 'Soupe de légumes', 'vegetable', { aliases: ['soupe', 'veloute'], groups: ['legume'] }),
  food('salad', 'Salade verte', 'vegetable', { aliases: ['salade'], groups: ['legume', 'crudite'] }),
  food('peanut-butter', 'Beurre de cacahuète', 'extra', { aliases: ['beurre de cacahouete', 'cacahuete', 'arachide'], groups: ['fruit a coque'] }),
];

export function getFood(id: string): Food | undefined {
  return FOODS.find((item) => item.id === id);
}

/**
 * Forme comparable d'un nom d'aliment : minuscules, sans accents ni article,
 * au singulier simple (« Les Pâtes » → « pate »).
 */
export function normalizeFoodName(value: string): string {
  return value
    .toLocaleLowerCase('fr')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`-]/g, ' ')
    .replace(/^(les|des|du|de la|de l|la|le|l)\s+/, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (word.length > 3 ? word.replace(/[sx]$/, '') : word))
    .join(' ');
}

/** Aliments du catalogue désignés par une saisie libre (nom, synonyme ou famille). */
export function matchFoods(input: string): Food[] {
  const key = normalizeFoodName(input);
  if (!key) return [];
  return FOODS.filter(
    (item) =>
      normalizeFoodName(item.name) === key ||
      item.aliases.some((alias) => normalizeFoodName(alias) === key) ||
      item.groups.some((group) => normalizeFoodName(group) === key),
  );
}

export type FoodStatus = 'liked' | 'tolerated' | 'refused' | 'neutral';

export interface FoodPreferenceIndex {
  status: (foodId: string) => FoodStatus;
  /** Saisies du profil qu'aucun aliment du catalogue ne reconnaît (non prises en compte). */
  unrecognized: string[];
}

/**
 * Statut de chaque aliment selon le profil. Un refus l'emporte toujours :
 * un aliment refusé (directement ou via sa famille) n'est jamais proposé.
 */
export function indexPreferences(preferences: FoodPreferences): FoodPreferenceIndex {
  const statuses = new Map<string, FoodStatus>();
  const unrecognized: string[] = [];
  const apply = (entries: readonly string[], status: Exclude<FoodStatus, 'neutral'>) => {
    for (const entry of entries) {
      const matches = matchFoods(entry);
      if (matches.length === 0) unrecognized.push(entry);
      for (const match of matches) {
        const current = statuses.get(match.id);
        if (current === 'refused') continue;
        if (status === 'refused' || current === undefined || (status === 'liked' && current === 'tolerated')) {
          statuses.set(match.id, status);
        }
      }
    }
  };
  apply(preferences.refused, 'refused');
  apply(preferences.liked, 'liked');
  apply(preferences.tolerated, 'tolerated');
  return { status: (foodId) => statuses.get(foodId) ?? 'neutral', unrecognized };
}
