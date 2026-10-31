import type { MealPhoto } from '../../domain/nutrition/types';
import { decodeImage, encodeImage, ImageError, releaseImage, useImageUrl } from '../../media/image';

/** Plus grand côté conservé : suffisant pour l'écran de l'iPhone, en restant léger (≈ 150–400 Ko). */
export const PHOTO_MAX_SIDE = 1280;
export const PHOTO_QUALITY = 0.82;

export { ImageError as PhotoError };

/**
 * Réduit la photo choisie (JPEG, 1280 px au plus) avant de l'enregistrer sur l'appareil.
 * Rien n'est envoyé : tout se passe dans le navigateur.
 */
export async function preparePhoto(file: File, mealId: string, id: string, now: string): Promise<MealPhoto> {
  const source = await decodeImage(file);
  try {
    const image = await encodeImage(source, PHOTO_MAX_SIDE, PHOTO_QUALITY);
    return { id, mealId, ...image, createdAt: now };
  } finally {
    releaseImage(source);
  }
}

export const usePhotoUrl = useImageUrl;
