import { isLocalTime } from '../calendar/time';
import { isIsoDate } from '../common/dates';
import { MEAL_SLOTS, PORTION_SIZES, type DrinkEntry, type MealEntry, type MealPhoto } from './types';

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isBooleanOrNull = (value: unknown) => value === null || typeof value === 'boolean';
/** Indépendant du contexte d'exécution (un ArrayBuffer relu d'IndexedDB peut venir d'un autre « realm »). */
const isArrayBuffer = (value: unknown): value is ArrayBuffer => Object.prototype.toString.call(value) === '[object ArrayBuffer]';

export function isStoredMeal(value: unknown): value is MealEntry {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.date === 'string' &&
    isIsoDate(value.date) &&
    MEAL_SLOTS.includes(value.slot as never) &&
    typeof value.skipped === 'boolean' &&
    typeof value.description === 'string' &&
    (value.portion === null || PORTION_SIZES.includes(value.portion as never)) &&
    isBooleanOrNull(value.protein) &&
    isBooleanOrNull(value.fruitOrVegetable) &&
    (value.photoId === null || typeof value.photoId === 'string') &&
    typeof value.notes === 'string'
  );
}

export function isStoredDrink(value: unknown): value is DrinkEntry {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.date === 'string' &&
    isIsoDate(value.date) &&
    typeof value.time === 'string' &&
    isLocalTime(value.time) &&
    typeof value.ml === 'number' &&
    Number.isInteger(value.ml) &&
    value.ml > 0
  );
}

export function isStoredPhoto(value: unknown): value is MealPhoto {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.mealId === 'string' &&
    typeof value.mimeType === 'string' &&
    value.mimeType.startsWith('image/') &&
    isArrayBuffer(value.data) &&
    value.data.byteLength > 0
  );
}

export type MealErrors = Partial<Record<'description' | 'notes', string>>;

export const MEAL_TEXT_MAX = 300;

/**
 * Un repas mangé doit dire ce qui a été mangé, même avec une photo : la photo illustre la saisie,
 * elle n'est pas analysée. Un repas sauté n'a besoin de rien d'autre.
 */
export function validateMeal(meal: MealEntry): MealErrors {
  const errors: MealErrors = {};
  if (!meal.skipped && meal.description.trim() === '') errors.description = 'Décris ce que tu as mangé, en quelques mots.';
  if (meal.description.length > MEAL_TEXT_MAX) errors.description = `${MEAL_TEXT_MAX} caractères maximum.`;
  if (meal.notes.length > MEAL_TEXT_MAX) errors.notes = `${MEAL_TEXT_MAX} caractères maximum.`;
  return errors;
}

/** Quantités acceptées pour une boisson (évite une faute de frappe à 25 000 ml). */
export function isValidDrinkMl(ml: number): boolean {
  return Number.isInteger(ml) && ml >= 50 && ml <= 2000;
}
