import { useEffect, useState } from 'react';

/**
 * Traitement local des images : tout se passe dans le navigateur, rien n'est envoyé.
 * Le réencodage via un canvas supprime aussi les métadonnées de la photo d'origine
 * (dont la position GPS éventuelle).
 */

/** Fichier d'origine accepté au maximum (une photo d'iPhone fait en général 2 à 6 Mo). */
export const IMAGE_MAX_INPUT_BYTES = 25 * 1024 * 1024;

export class ImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageError';
  }
}

export interface EncodedImage {
  mimeType: string;
  data: ArrayBuffer;
  width: number;
  height: number;
}

type Decoded = CanvasImageSource & { width: number; height: number };

/** Vérifie le fichier choisi et le décode (une seule fois, pour plusieurs tailles). */
export async function decodeImage(file: File): Promise<Decoded> {
  if (!file.type.startsWith('image/')) throw new ImageError('Ce fichier n’est pas une image.');
  if (file.size > IMAGE_MAX_INPUT_BYTES) throw new ImageError('Image trop lourde (25 Mo au maximum).');
  try {
    if (typeof createImageBitmap === 'function') return await createImageBitmap(file);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    throw new ImageError('Image illisible. Réessaie avec une autre photo (format JPEG ou PNG).');
  }
}

/** Réduit une image décodée (plus grand côté `maxSide`) et l'encode en JPEG. */
export async function encodeImage(source: Decoded, maxSide: number, quality: number): Promise<EncodedImage> {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new ImageError('Impossible de préparer la photo sur cet appareil.');
  context.drawImage(source, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new ImageError('Impossible de préparer la photo sur cet appareil.');
  return { mimeType: 'image/jpeg', data: await blob.arrayBuffer(), width, height };
}

export function releaseImage(source: Decoded): void {
  if ('close' in source && typeof source.close === 'function') source.close();
}

/** Adresse locale (blob:) d'une image, libérée quand elle n'est plus affichée. */
export function useImageUrl(image: Pick<EncodedImage, 'data' | 'mimeType'> | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!image) return undefined;
    const next = URL.createObjectURL(new Blob([image.data], { type: image.mimeType }));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'URL dépend d'une ressource externe à libérer
    setUrl(next);
    return () => {
      URL.revokeObjectURL(next);
      setUrl(null);
    };
  }, [image]);
  return image ? url : null;
}
