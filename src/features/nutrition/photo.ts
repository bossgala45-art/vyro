import { useEffect, useState } from 'react';
import type { MealPhoto } from '../../domain/nutrition/types';

/** Plus grand côté conservé : suffisant pour l'écran de l'iPhone, en restant léger (≈ 150–400 Ko). */
export const PHOTO_MAX_SIDE = 1280;
export const PHOTO_QUALITY = 0.82;
/** Fichier d'origine accepté au maximum (une photo d'iPhone fait en général 2 à 6 Mo). */
export const PHOTO_MAX_INPUT_BYTES = 25 * 1024 * 1024;

export class PhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhotoError';
  }
}

async function decode(file: Blob): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Réduit la photo choisie (JPEG, 1280 px au plus) avant de l'enregistrer sur l'appareil.
 * Rien n'est envoyé : tout se passe dans le navigateur.
 */
export async function preparePhoto(file: File, mealId: string, id: string, now: string): Promise<MealPhoto> {
  if (!file.type.startsWith('image/')) throw new PhotoError('Ce fichier n’est pas une image.');
  if (file.size > PHOTO_MAX_INPUT_BYTES) throw new PhotoError('Image trop lourde (25 Mo au maximum).');
  let source: Awaited<ReturnType<typeof decode>>;
  try {
    source = await decode(file);
  } catch {
    throw new PhotoError('Image illisible. Réessaie avec une autre photo (format JPEG ou PNG).');
  }
  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new PhotoError('Impossible de préparer la photo sur cet appareil.');
  context.drawImage(source, 0, 0, width, height);
  if ('close' in source && typeof source.close === 'function') source.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', PHOTO_QUALITY));
  if (!blob) throw new PhotoError('Impossible de préparer la photo sur cet appareil.');
  return { id, mealId, mimeType: 'image/jpeg', data: await blob.arrayBuffer(), width, height, createdAt: now };
}

/** Adresse locale (blob:) d'une photo, libérée quand elle n'est plus affichée. */
export function usePhotoUrl(photo: Pick<MealPhoto, 'data' | 'mimeType'> | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!photo) return undefined;
    const next = URL.createObjectURL(new Blob([photo.data], { type: photo.mimeType }));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'URL dépend d'une ressource externe à libérer
    setUrl(next);
    return () => {
      URL.revokeObjectURL(next);
      setUrl(null);
    };
  }, [photo]);
  return photo ? url : null;
}
