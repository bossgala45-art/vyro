import type { LocalTime } from '../calendar/types';
import type { IsoDate } from '../common/dates';

export const MEAL_SLOTS = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

/** Taille de portion ressentie : aucune quantité n'est déduite, `null` = « je ne sais pas ». */
export const PORTION_SIZES = ['small', 'normal', 'large'] as const;
export type PortionSize = (typeof PORTION_SIZES)[number];

/**
 * Repas du journal : uniquement ce que l'utilisateur a déclaré. VYRO ne calcule ni calories
 * ni grammes ; une réponse absente reste `null` (jamais devinée).
 */
export interface MealEntry {
  id: string;
  date: IsoDate;
  slot: MealSlot;
  /** Repas sauté (fréquent pour le petit-déjeuner). */
  skipped: boolean;
  /** Ce qui a été mangé, en texte libre. */
  description: string;
  portion: PortionSize | null;
  /** Le repas contenait-il une source de protéines ? */
  protein: boolean | null;
  /** Le repas contenait-il un fruit ou un légume ? */
  fruitOrVegetable: boolean | null;
  /** Photo d'illustration (stockée à part, uniquement sur l'appareil). */
  photoId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/** Photo d'un repas, réduite avant stockage, jamais envoyée à un serveur. */
export interface MealPhoto {
  id: string;
  mealId: string;
  mimeType: string;
  /** Contenu de l'image (ArrayBuffer : stockage IndexedDB fiable sur Safari). */
  data: ArrayBuffer;
  width: number;
  height: number;
  createdAt: string;
}

/** Une boisson ajoutée au suivi d'hydratation. */
export interface DrinkEntry {
  id: string;
  date: IsoDate;
  /** Heure locale d'ajout. */
  time: LocalTime;
  ml: number;
  createdAt: string;
}

export interface HydrationReminders {
  /** Rappels affichés dans VYRO quand l'application est ouverte. */
  enabled: boolean;
  from: LocalTime;
  to: LocalTime;
  everyMinutes: number;
}

export interface HydrationSettings {
  /** Repère quotidien de boisson, en ml (réglable). */
  baseGoalMl: number;
  /** Ajout par séance de sport du jour (basket ou musculation), en ml. */
  sportExtraMl: number;
  /** Contenance d'un verre, pour l'ajout rapide. */
  glassMl: number;
  reminders: HydrationReminders;
}

/**
 * Repères par défaut, présentés comme généraux et réglables :
 * - 2 L de boissons par jour : l'EFSA (2010) retient 2,5 L d'eau par jour pour un homme adulte,
 *   dont environ 20 % apportés par les aliments ;
 * - + 0,5 L par séance : ordre de grandeur prudent pour compenser la transpiration d'une séance
 *   (les besoins réels varient beaucoup selon la chaleur et l'intensité).
 */
export const DEFAULT_HYDRATION: HydrationSettings = {
  baseGoalMl: 2000,
  sportExtraMl: 500,
  glassMl: 250,
  reminders: { enabled: false, from: '09:00', to: '21:00', everyMinutes: 120 },
};

export const REMINDER_INTERVALS = [60, 90, 120, 180] as const;
