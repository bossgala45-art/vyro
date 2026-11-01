import { isStoredDrink, isStoredMeal, isStoredPhoto, isValidDrinkMl, validateMeal } from '../../domain/nutrition/integrity';
import type { DrinkEntry, MealEntry, MealPhoto } from '../../domain/nutrition/types';
import { db as defaultDb, type VyroDatabase } from '../db';
import { StorageError, guard } from '../errors';

/** Changement de photo demandé avec l'enregistrement d'un repas. */
export type PhotoChange = { action: 'keep' } | { action: 'remove' } | { action: 'replace'; photo: MealPhoto };

export function createNutritionRepository(db: VyroDatabase) {
  return {
    /** Repas du journal, du plus ancien au plus récent (sans les photos). */
    async listMeals(): Promise<MealEntry[]> {
      const records = await guard(() => db.meals.orderBy('date').toArray());
      const invalid = records.filter((record) => !isStoredMeal(record));
      if (invalid.length > 0) throw new StorageError('integrity', { detail: `${invalid.length} repas` });
      return records;
    },

    async getMeal(id: string): Promise<MealEntry | null> {
      const record = await guard(() => db.meals.get(id));
      if (record === undefined) return null;
      if (!isStoredMeal(record)) throw new StorageError('integrity', { detail: 'repas' });
      return record;
    },

    /**
     * Enregistre un repas et sa photo dans une seule transaction : en cas d'erreur
     * (espace plein, par exemple), ni le repas ni la photo ne sont modifiés.
     */
    async saveMeal(meal: MealEntry, change: PhotoChange = { action: 'keep' }): Promise<MealEntry> {
      if (!isStoredMeal(meal) || Object.keys(validateMeal(meal)).length > 0) throw new RangeError('Repas invalide.');
      if (change.action === 'replace' && (!isStoredPhoto(change.photo) || change.photo.mealId !== meal.id)) {
        throw new RangeError('Photo invalide.');
      }
      return guard(() =>
        db.transaction('rw', db.meals, db.mealPhotos, async () => {
          const previous = await db.meals.get(meal.id);
          const previousPhoto = previous?.photoId ?? null;
          let photoId = previousPhoto;
          if (change.action !== 'keep' && previousPhoto) {
            await db.mealPhotos.delete(previousPhoto);
            photoId = null;
          }
          if (change.action === 'replace') {
            await db.mealPhotos.put(change.photo);
            photoId = change.photo.id;
          }
          const saved = { ...meal, photoId };
          await db.meals.put(saved);
          return saved;
        }),
      );
    },

    /** Supprime un repas et sa photo, définitivement. */
    async removeMeal(id: string): Promise<void> {
      await guard(() =>
        db.transaction('rw', db.meals, db.mealPhotos, async () => {
          await db.mealPhotos.where('mealId').equals(id).delete();
          await db.meals.delete(id);
        }),
      );
    },

    async getPhoto(id: string): Promise<MealPhoto | null> {
      const record = await guard(() => db.mealPhotos.get(id));
      if (record === undefined) return null;
      if (!isStoredPhoto(record)) throw new StorageError('integrity', { detail: 'photo de repas' });
      return record;
    },

    /** Boissons notées, de la plus ancienne à la plus récente. */
    async listDrinks(): Promise<DrinkEntry[]> {
      const records = await guard(() => db.drinks.orderBy('date').toArray());
      const invalid = records.filter((record) => !isStoredDrink(record));
      if (invalid.length > 0) throw new StorageError('integrity', { detail: `${invalid.length} boisson(s)` });
      return records;
    },

    async addDrink(drink: DrinkEntry): Promise<void> {
      if (!isStoredDrink(drink) || !isValidDrinkMl(drink.ml)) throw new RangeError('Quantité invalide.');
      await guard(() => db.drinks.add(drink));
    },

    async removeDrink(id: string): Promise<void> {
      await guard(() => db.drinks.delete(id));
    },
  };
}

export type NutritionRepository = ReturnType<typeof createNutritionRepository>;
export const nutritionRepository = createNutritionRepository(defaultDb);
